var app         = window.ogc;

app.module.controller('LandingCtrl', function($scope) {
    var clientId = '504437119269.apps.googleusercontent.com';
    var apiKey   = '<add key here>';
    var scopes   = 'https://www.googleapis.com/auth/plus.me';
    $scope.auth  = false;
    $scope.gid   = null;
    
    app.landing.on('connect', function () {
        app.landing.emit('connect', {gid:$scope.gid});
        // instant touch effects, no 300 ms delay
        document.addEventListener("touchstart", function(){}, true);
        // capture enter key presses for all form inputs, unless shift key is held
        jQuery('textarea , input:not([type="hidden"])').each(function(){
            var self = this;
            jQuery(self).bind('keypress', function(e){
                if ( !e.shiftKey && e.keyCode == 13 && jQuery(this).val().length > 2 ) {
                    e.preventDefault();
                    jQuery(this).submit();
                }
            });
        });
        // custom show/hide functionality
        jQuery('[toggle-button]').each(function(){
            var self = this;
            jQuery(self).on('click',function(e){
                jQuery('#'+$(this).attr('toggle-button')).toggle();
                jQuery(this).find('[toggle-text]').html() == "Show" ? jQuery(this).find('[toggle-text]').html('Hide') : jQuery(this).find('[toggle-text]').html('Show');
                jQuery(this).find('[toggle-icon]').hasClass('glyphicon-chevron-left') ? jQuery(this).find('[toggle-icon]').removeClass('glyphicon-chevron-left').addClass('glyphicon-chevron-down') : jQuery(this).find('[toggle-icon]').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-left');
            });
        });
        // remove app scrollbars on smaller screens
        if ($(window).width()>=975) {
            jQuery('.noScroll').each(function(){
                jQuery(this).removeClass('noScroll').addClass('scrollbar');
            });
        } else {
            jQuery('.scrollbar').each(function(){
                jQuery(this).removeClass('scrollbar').addClass('noScroll');
            });
        }
        jQuery(window).resize(function() {
            if ($(window).width()>=975) {
                jQuery('.noScroll').each(function(){
                    jQuery(this).removeClass('noScroll').addClass('scrollbar');
                });
            } else {
                jQuery('.scrollbar').each(function(){
                    jQuery(this).removeClass('scrollbar').addClass('noScroll');
                });
            }
        });
    });

    app.landing.on('checkLogin', function (data) {
        jQuery('body').removeClass('hide');
        if (window.location.port == 3000) {
            app.connection.emit('login', { gid: "108887414317459154833" , image: "https://lh6.googleusercontent.com/-hYZ2O7Tw15c/AAAAAAAAAAI/AAAAAAAABQ8/7JJyfgnnpI0/photo.jpg?sz=50" });
        } else if ($scope.auth) {
            app.connection.emit('login', { gid: $scope.gid });
        }
    });

    $scope.login = function () {
        gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, function (authResult) {
            if (authResult && !authResult.error) {
                gapi.client.load('plus', 'v1', function() {
                    var request = gapi.client.plus.people.get({
                        'userId': 'me'
                    });
                    request.execute(function(resp) {
                        app.connection.emit('login', {
                            gid:    resp.id,
                            image:  resp.image.url
                        });
                    });
                });
            } else {
                app.connection.emit('log',authResult.error);
            }
        });
    };
    
    app.connection.on('auth', function (data) {
        jQuery('body').removeClass('background');
        $scope.gid  = data.gid;
        $scope.auth = true;
        $scope.$apply();
    });

});