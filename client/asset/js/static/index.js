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
    
    jQuery('textarea , input:not([type="hidden"])').each(function(){
        var self = this;
        jQuery(self).bind('keypress', function(e){
            if ( !e.shiftKey && e.keyCode == 13 && jQuery(this).val().length > 2 ) {
                e.preventDefault();
                jQuery(this).submit();
            }
        });
    });
    
    jQuery('[toggle-button]').each(function(){
        var self = this;
        jQuery(self).on('click',function(e){
            jQuery('#'+$(this).attr('toggle-button')).toggle();
            jQuery(this).find('[toggle-text]').html() == "Show" ? jQuery(this).find('[toggle-text]').html('Hide') : jQuery(this).find('[toggle-text]').html('Show');
            jQuery(this).find('[toggle-icon]').hasClass('glyphicon-chevron-left') ? jQuery(this).find('[toggle-icon]').removeClass('glyphicon-chevron-left').addClass('glyphicon-chevron-down') : jQuery(this).find('[toggle-icon]').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-left');
        });
    });

    jQuery(window).resize(function() {
        if ($(window).width()>=975) {
            jQuery('.noScroll').each(function(){
                jQuery(this).removeClass('noScroll').addClass('scrollbar');
            });
        }
        else {
            jQuery('.scrollbar').each(function(){
                jQuery(this).removeClass('scrollbar').addClass('noScroll');
            });
        }
    });
});