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