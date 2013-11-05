var app         = window.ogc;

app.module.controller('ChatCtrl', function($scope) {
    "use strict";
    $scope.profile  = {};
    $scope.rooms    = {};
    $scope.auth     = false;
    $scope.messages = [];
    $scope.newRoom  = {};
    $scope.editingRoom = {};
    $scope.joiningRoom = {};

    var addDateTime = function(message) {
        var DAYNAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            MONTHNAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            datetime = new Date();
        message.time = ( datetime.getHours() === 0 ? 12 : ( datetime.getHours() > 12 ? datetime.getHours() - 12 : datetime.getHours() ) ) + ":" + (datetime.getMinutes() < 10 ? 0 : "") + datetime.getMinutes() + " " + (datetime.getHours() > 11 ? "PM" : "am") + " " + DAYNAMES[datetime.getDay()] + " " + MONTHNAMES[datetime.getMonth()] + " " + datetime.getDate();
        message.text = message.text.replace(/(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/img, '<a target="_blank" href="$1">$1</a>');
        return message;
    }, newNotification = function (options) {
        var notification; // isWindowFocused = document.querySelector(":focus") === null ? false : true;
        if (window.Notification) { /* Safari 6, Chrome (23+) */
            notification =  new Notification( options.title, {
                icon: options.icon,
                body: options.body,
                tag: options.tag
            });
        } else if (window.webkitNotifications) { /* FF with html5Notifications plugin installed */
            notification = window.webkitNotifications.createNotification(options.icon, options.title, options.body);
        } else if (navigator.mozNotification) { /* Firefox Mobile */
            notification = navigator.mozNotification.createNotification(options.title, options.body, options.icon);
        } else if (window.external && window.external.msIsSiteMode()) { /* IE9+ */
            //Clear any previous notifications
            window.external.msSiteModeClearIconOverlay();
            window.external.msSiteModeSetIconOverlay(options.icon, options.title);
            window.external.msSiteModeActivate();
            notification = {
                "ieVerification": Math.floor((Math.random() * 10) + 1)+1
            };
        }
        //if (!isWindowFocused) notification.show();
        return notification;
    };
    
    app.connection.on('auth', function (data) {
        $scope.profile = data;
        $scope.auth = true;
        $scope.$apply();
    });
    
    app.connection.on('update-profile', function (data) {
        $scope.profile = data;
        $scope.$apply();
    });
    
    app.connection.on('clear-messages', function ( data ) {
        $scope.messages = [];
        $scope.$apply();
    });
    
    app.connection.on('rooms', function ( data ) {
        var online = 0;
        angular.forEach(data, function (room, roomName ) {
            online = 0;
            angular.forEach(room.members, function( member, gid ){
                if ( member.online ) { online++; }
            });
            data[roomName].viewing = online;
        });
        $scope.rooms = data;
        $scope.$apply();
    });
    
    app.connection.on('receive-message', function (data) {
        var message = addDateTime(data), $messages = jQuery('#messages');
        $scope.messages.push(message);
        if ( $scope.messages.length > parseInt( $scope.profile.settings.messages, 0 ) ) {
            $scope.messages = $scope.messages.slice( ( $scope.messages.length - parseInt( $scope.profile.settings.messages, 0 ) ), $scope.messages.length );
        }
        $messages.scrollTop( $messages.prop( "scrollHeight" ) );
        $scope.text = '';
        $scope.$apply();
    });
    
    app.connection.on('new-message', function (data) {
        if ( app.notifications && $scope.profile.settings.notifications ) {
            var notification = newNotification({
                icon: data.image,
                title: data.name + " said:",
                body: data.text
            });
            if ( notification.show ) { notification.show(); }
        }
        var message = addDateTime(data), $messages = jQuery('#messages');
        $scope.messages.push(message);
        if ( $scope.messages.length > $scope.profile.settings.messages ) {
            $scope.messages = $scope.messages.slice(( $scope.messages.length - parseInt($scope.profile.settings.messages) ),$scope.messages.length);
        }
        $messages.scrollTop( $messages.prop("scrollHeight") );
        $scope.text = '';
        $scope.$apply();
    });
    
    $scope.send = function send() {
        if ( $scope.text.length > 2 ) {
            app.connection.emit('new-message', $scope.text);
            var $messages = jQuery('#messages'),
                message = {
                    text: $scope.text,
                    color: $scope.profile.color,
                    name: $scope.profile.name,
                    image: $scope.profile.image
                };
            message = addDateTime(message);
            $scope.messages.push(message);
            if ( $scope.messages.length > $scope.profile.settings.messages ) {
                $scope.messages = $scope.messages.slice(( $scope.messages.length - parseInt($scope.profile.settings.messages) ),$scope.messages.length);
            }
            $messages.scrollTop( $messages.prop("scrollHeight") );
            $scope.text = '';
            $scope.$apply();
        }
    };

    $scope.add = function () {
        app.connection.emit('add-room', $scope.newRoom );
        $scope.newRoom = {};
        jQuery('#newRoom').modal('hide');
    };

    $scope.joinRoom = function (room) {
        if ($scope.rooms[room].private) {
            jQuery('#joinRoom').modal();
            $scope.joiningRoom.id = $scope.rooms[room].id;
            $scope.joiningRoom.name = $scope.rooms[room].name;
        } else {
            app.connection.emit('join-room', $scope.rooms[room] );
        }
    };

    $scope.join = function () {
        app.connection.emit('join-room', $scope.joiningRoom );
        $scope.joiningRoom = {};
        jQuery('#joinRoom').modal('hide');
    };

    $scope.editRoom = function (room) {
        $scope.editingRoom = $scope.rooms[room];
    };
    
    $scope.edit = function () {
        app.connection.emit('edit-room', $scope.editingRoom );
        $scope.editingRoom = {};
        jQuery('#editRoom').modal('hide');
    };

    $scope.makeAdmin = function (room,gid) {
        app.connection.emit('make-admin', {room:room,gid:gid} );
    };

    $scope.revokeAdmin = function (room,gid) {
        app.connection.emit('revoke-admin', {room:room,gid:gid} );
    };

    $scope.kick = function (room,id) {
        app.connection.emit('kick-member', {room:room,id:id} );
    };

});
