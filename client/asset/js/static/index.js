var clientId = '504437119269.apps.googleusercontent.com';
var apiKey = 'AIzaSyAa4jBJ9FXmBAPXTN8CdC934D4yyAuvr7w';
var scopes = 'https://www.googleapis.com/auth/plus.me';
/* function handleClientLoad() {
    gapi.client.setApiKey(apiKey);
    window.setTimeout(function() {
        gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
    },1);
}
*/
function handleAuthResult(authResult) {
    var authorizeButton = document.getElementById('authorize-button');
    if (authResult && !authResult.error) {
        gapi.client.load('plus', 'v1', function() {
            var request = gapi.client.plus.people.get({
                'userId': 'me'
            });
            request.execute(function(resp) {
                window.socket.emit('login', resp);
            });
        });
    } else {
        authorizeButton.style.visibility = '';
        authorizeButton.onclick = function (event) {
            gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult);
            return false;
        };
    }
}
$(document).ready(function() {
    window.ogc = {};
    var ogc = window.ogc;
    document.addEventListener("touchstart", function(){}, true);
    if (navigator.mozNotification) {
        ogc.notifications = navigator.mozNotification;
    } else if (window.webkitNotifications) {
        ogc.notifications = window.webkitNotifications
    }
    if (ogc.notifications) {
        ogc.level = ogc.notifications.checkPermission();
    }

    jQuery( 'textarea[ng-model="text"]' ).bind('keypress', function(e){
        if ( e.keyCode == 13 ) {
            e.preventDefault();
            jQuery(this).submit();
        }
    });

    $(window).resize(function() {
        if ($(window).width()>=975) {
            $('.noScroll').each(function(){
                $(this).removeClass('noScroll').addClass('scrollbar');
            });
        }
        else {
            $('.scrollbar').each(function(){
                $(this).removeClass('scrollbar').addClass('noScroll');
            });
        }
    });
});