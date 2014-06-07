/* global HashcashIO, jQuery */
(function($) {
    var defaultHashcashUrl = 'https://hashcash.io' || window.HashcashIOUrl;
    var hashcash, hashcashReady;

    // If HashcashIO API is not loaded yet, load it asynchroniously
    if (! window.HashcashIO) {
        var clientApiUrl = defaultHashcashUrl + '/js/libs/pow/pow.client.min.js';

        // If RequireJS is in use - use require() call. Otherwise load script async
        if (window.require) {
            require([clientApiUrl], createHascashInstance);
        }
        else {
            loadScript(clientApiUrl, createHascashInstance);
        }
    }
    else {
        createHascashInstance();
    }

    function createHascashInstance() {
        hashcash = new HashcashIO({
            hashcashUrl: defaultHashcashUrl,
            readyCb: function() {
                hashcashReady = true;
            }
        });
    }

    // Function to generate random id
    var guid = (function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return function() {
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        };
    })();

    $.fn.hashcash = function(options) {
        var $el = this;

        var settings = $.extend({
            autoId: true,
            id: guid(),
            complexity: 0.01,
            key: null,
            beforeCb: null,
            progressCb: null,
            doneCb: null,
            targetEl: null,
            hashcashInputName: 'hashcashid'
        }, options );

        // If hashcash iframe is not ready yet, schedule it again
        if (! hashcashReady) {
            setTimeout(function() {
                $el.hashcash(options);
            }, 100);

            return;
        }

        return this.each(function() {
            var $el = $(this);

            if (! settings.key) {
                throw new Error('Hashcash.IO key is required. Get it at https://hashcash.io');
            }

            var $form = $el.parents('form').eq(0);

            if (! $form) {
                throw new Error('Hashcash plugin requires button to be with in <form> element.');
            }

            if (settings.beforeCb) {
                settings.beforeCb.apply($el);
            }

            // If switch widget is not yet on a form, add it
            var $switch = $form.find(".hashcash-onoffswitch");
            if ($switch.length < 1) {
                $switch = $(
                    '<div class="hashcash-onoffswitch">' +
                    '  <input type="checkbox" name="hashcash-onoffswitch" class="hashcash-onoffswitch-checkbox" id="hashcash-switch">' +
                    '  <label class="hashcash-onoffswitch-label" for="hashcash-switch">' +
                    '    <span class="hashcash-onoffswitch-inner"></span>' +
                    '    <span class="hashcash-onoffswitch-switch"></span>' +
                    '  </label>' +
                    '</div>'
                );

                if (settings.targetEl) {
                    var $container = $(settings.targetEl);
                    $container.append($switch);
                }
                else {
                    $el.before($switch);
                }
            }

            var $hashcashField = $form.find('input[name="' + settings.hashcashInputName + '"]');
            var id = settings.id;

            if ($hashcashField.length < 1) {
                $hashcashField = $('<input type="hidden" name="' + settings.hashcashInputName + '" />');
                $form.append($hashcashField);
            }

            if (($hashcashField.val() && !$switch.hasClass("hashcash-computed")) || !settings.autoId) {
                id = $hashcashField.val();
            }
            else {
                $hashcashField.val(id);
            }

            // Reset switch
            $switch.removeClass("hashcash-computed").find("input").removeAttr("checked");

            // This will update visual progress
            var currentProgress = 0;
            var progressCb = function(totalDone) {
                var percentage = totalDone / settings.complexity * 100;
                if (percentage > 100) { percentage = 100; }

                if (percentage < currentProgress) {
                    return;
                }

                currentProgress = percentage;

                $switch.find(".hashcash-onoffswitch-inner").css({ marginLeft: "-" + (100 - percentage) + "%" });
            };

            // Disable submit button
            $el.addClass("hashcash-disabled").attr("disabled", true);

            // Reset progress
            progressCb(0);

            // On a click run whole hashcash computation stuff
            $switch.one('click', function() {
                $switch.addClass("hashcash-computing");

                hashcash.calculate({
                    publicKey: settings.key,
                    id: id,
                    limit: settings.complexity,
                    done: function() {
                        $switch.removeClass("hashcash-computing").addClass("hashcash-computed");
                        $el.removeClass("hashcash-disabled").removeAttr("disabled");

                        if (settings.doneCb) {
                            settings.doneCb.apply($el);
                        }

                        $switch.find("input").attr("checked", true);
                    },
                    progress: function(totalDone) {
                        progressCb(totalDone);

                        if (settings.progressCb) {
                            settings.progressCb.apply($el, [totalDone]);
                        }
                    }
                });

                progressCb(settings.Computing * 0.1);
            });

            // Prevent default click event processing by checkbox
            $switch.click(function(e) { return e.preventDefault(); });
        });
    };

    function loadScript(url, callback){

        var script = document.createElement("script");
        script.type = "text/javascript";

        if (script.readyState){  //IE
            script.onreadystatechange = function() {
                if (script.readyState == "loaded" ||
                    script.readyState == "complete")
                {
                    script.onreadystatechange = null;
                    callback();
                }
            };
        } else {  //Others
            script.onload = function() {
                callback();
            };
        }

        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    }
}(jQuery));
