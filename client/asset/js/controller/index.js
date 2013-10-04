var ogc         = window.ogc;
var app         = angular.module('OpenGroupChat', ['toggle-switch']).config(function($sceProvider) {
    $sceProvider.enabled(false);
});
var socket      = window.socket;
var sid         = socket.id;

socket.on('info', function (message) {
    alert(message);
});

app.controller('SettingsController', function($scope) {
    $scope.settings = {};

    socket.on('myProfile', function (profile) {
        $scope.settings = profile.settings;
        $scope.$apply();
    });

    $scope.save = function () {
        socket.emit('saveSettings', $scope.settings);
    };
    
    $scope.$watch('settings.notifications', function() {
        if ( $scope.settings.notifications !== false && "undefined" !== typeof ogc && "undefined" !== typeof ogc.level && ogc.level === 1 ) ogc.notifications.requestPermission();
    });
    
});

app.controller('RoomController', function($scope) {
    $scope.room = {};

    $scope.save = function () {
        socket.emit('createRoom', $scope.room);
        $scope.room = {};
        $('#newRoom').modal('hide');
    };
});

app.controller('ChatController', function($scope) {
    $scope.messages = [];
    $scope.users    = [];
    $scope.rooms    = [];
    $scope.profile  = {};
    $scope.editingRoom = {};
    $scope.name     = '';
    $scope.text     = '';
    $scope.time     = '';
    $scope.color    = '';

    socket.on('connect', function () {
        socket.emit('connect', $scope.profile);
    });
    
    socket.on('users', function (users) {
        $scope.users = users;
        $scope.$apply();
    });

    socket.on('checkLogin', function (data) {
        var authorizeButton = document.getElementById('authorize-button');
        if (authorizeButton) {
            authorizeButton.style.visibility = '';
            gapi.client.setApiKey('AIzaSyAa4jBJ9FXmBAPXTN8CdC934D4yyAuvr7w');
            authorizeButton.onclick = function (e) {
                gapi.auth.authorize({client_id: '504437119269.apps.googleusercontent.com', scope: 'https://www.googleapis.com/auth/plus.me', immediate: false}, handleAuthResult);
                return false;
            };
        }
    });

    socket.on('login', function (profile) {
        var logo = document.getElementById('ogc-logo');
        var authorizeButton = document.getElementById('authorize-button');
        if (authorizeButton && profile.gid) {
            var image = document.querySelector('#gapi-image');
            image.src = profile.image;
            authorizeButton.parentNode.removeChild(authorizeButton);
            if (jQuery('.container-fluid').hasClass('hide')) { jQuery('.container-fluid').removeClass('hide'); }
            if (jQuery('#navbar').hasClass('hide')) { jQuery('#navbar').removeClass('hide'); }
            logo.parentNode.removeChild(logo);
            $('body').removeClass('background');
        } else {
            authorizeButton.style.visibility = '';
        }
    });

    /*
     * Rooms
     */
    socket.on('rooms', function (rooms) {
        $scope.rooms = rooms;
        $scope.$apply();
    });
    $scope.joinRoom = function joinRoom(room) {
        if ($scope.rooms[room].private) {
            jQuery('#joinRoom').modal();
            $scope.roomName = room;
        } else {
            socket.emit('joinRoom', $scope.rooms[room] );
            $scope.messages = [];
        }
    };
    $scope.edit = function () {
        var roomName = $scope.editingRoom.id;
        if ( $scope.rooms[roomName].creator != $scope.profile.gid ) {
            jQuery('#editRoom').modal('hide');
            alert('you are not the owner of this room');
        } else {
            socket.emit('editRoom', $scope.editingRoom );
        }
    };
    $scope.editRoom = function editRoom(room) {
        $scope.editingRoom = $scope.rooms[room];
    };
    $scope.join = function () {
        if ($scope.rooms[$scope.roomName].password === $scope.password) {
            socket.emit('joinRoom', $scope.rooms[$scope.roomName] );
            $scope.messages = [];
            $scope.roomName = "";
            $scope.password = "";
            $('#joinRoom').modal('hide');
        } else {
            alert('incorrect password');
        }
    };
    $scope.makeAdmin = function (room,gid) {
        socket.emit('makeAdmin', {room:room,gid:gid} );
    };
    $scope.revokeAdmin = function (room,gid) {
        socket.emit('revokeAdmin', {room:room,gid:gid} );
    };
    socket.on('roomUserJoin', function (user) {
        if ( ( "lobby" !== $scope.profile.room && ogc.notifications && $scope.profile.settings.notifications && $scope.profile.settings.join ) || ( "lobby" === $scope.profile.room && ogc.notifications && $scope.profile.settings.notifications && $scope.profile.settings.join && $scope.profile.settings.lobby  ) ) {
            var notify,
                    iconURL = user.image,
                    title = user.name,
                    desc = "User Joined Room";
            if (navigator.mozNotification) {
                notify = navigator.mozNotification.createNotification(title, desc, iconURL);
            } else if (window.webkitNotifications) {
                notify = window.webkitNotifications.createNotification(iconURL, title, desc);  
            }
            notify.show();
        }
    });
    socket.on('roomUserLogin', function (user) {
        if (ogc.notifications && $scope.profile.settings.notifications && $scope.profile.settings.login ) {
            var notify,
                    iconURL = user.image,
                    title = user.name,
                    desc = "User Login";
            if (navigator.mozNotification) {
                notify = navigator.mozNotification.createNotification(title, desc, iconURL);
            } else if (window.webkitNotifications) {
                notify = window.webkitNotifications.createNotification(iconURL, title, desc);  
            }
            notify.show();
        }
    });
    socket.on('roomUserLeft', function (user) {
        if (ogc.notifications && !ogc.level && $scope.profile.settings.notifications && $scope.profile.settings.leave ) {
            var notify,
                    iconURL = user.image,
                    title = user.name,
                    desc = "User Left Room";
            if (navigator.mozNotification) {
                notify = navigator.mozNotification.createNotification(title, desc, iconURL);
            } else if (window.webkitNotifications) {
                notify = window.webkitNotifications.createNotification(iconURL, title, desc);  
            }
            notify.show();
        }
    });
    socket.on('roomUserLogout', function (user) {
        if (ogc.notifications && !ogc.level && $scope.profile.settings.notifications && $scope.profile.settings.leave ) {
            var notify,
                    iconURL = user.image,
                    title = user.name,
                    desc = "User Logout";
            if (navigator.mozNotification) {
                notify = navigator.mozNotification.createNotification(title, desc, iconURL);
            } else if (window.webkitNotifications) {
                notify = window.webkitNotifications.createNotification(iconURL, title, desc);  
            }
            notify.show();
        }
    });
    /*
     * Profile Updates
     */
    socket.on('myProfile', function (profile) {
        $scope.name         = profile.name;
        $scope.color        = profile.color;
        $scope.room         = profile.room;
        $scope.profile      = profile;
        $scope.$apply();
    });
     /*
     * Send Message
     */
    $scope.send = function send() {
      if ( $scope.text.length > 2 ) socket.emit('message', $scope.text);
      $scope.text = '';
    };
    /*
     * Recieving New Message
     */
    var DAYNAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHNAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    socket.on('message', function (data) {
      var datetime = new Date();
      data.time = ( datetime.getHours() === 0 ? 12 : ( datetime.getHours() > 12 ? datetime.getHours() - 12 : datetime.getHours() ) )
                + ":" + 
                (datetime.getMinutes() < 10 ? 0 : "") + datetime.getMinutes()
                + " " + 
                (datetime.getHours() > 11 ? "PM" : "am") + " " +
                DAYNAMES[datetime.getDay()] + " " + MONTHNAMES[datetime.getMonth()] + " " + datetime.getDate();
      data.text = data.text.replace(/(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/img, '<a target="_blank" href="$1">$1</a>');
      $scope.messages.push(data);
        if ( $scope.messages.length > $scope.profile.settings.messages ) {
            $scope.messages = $scope.messages.slice(( $scope.messages.length - parseInt($scope.profile.settings.messages) ),$scope.messages.length);
        }
      $scope.$apply();
      $('#messages').scrollTop($('#messages').prop("scrollHeight"));
    });
    socket.on('newMessage', function (data) {
      var datetime = new Date();
      data.time = ( datetime.getHours() === 0 ? 12 : ( datetime.getHours() > 12 ? datetime.getHours() - 12 : datetime.getHours() ) )
                + ":" + 
                (datetime.getMinutes() < 10 ? 0 : "") + datetime.getMinutes()
                + " " + 
                (datetime.getHours() > 11 ? "PM" : "am") + " " +
                DAYNAMES[datetime.getDay()] + " " + MONTHNAMES[datetime.getMonth()] + " " + datetime.getDate();
      data.text = data.text.replace(/(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/img, '<a target="_blank" href="$1">$1</a>');
      $scope.messages.push(data);
        if ( $scope.messages.length > $scope.profile.settings.messages ) {
            $scope.messages = $scope.messages.slice(( $scope.messages.length - parseInt($scope.profile.settings.messages) ),$scope.messages.length);
        }
      if ( ogc.notifications && $scope.profile.settings.notifications ) {
        var notify,
                iconURL = data.image,
                title = data.name + " said:",
                desc = data.text;
        if (navigator.mozNotification) {
            notify = navigator.mozNotification.createNotification(title, desc, iconURL);
        } else if (window.webkitNotifications) {
            notify = window.webkitNotifications.createNotification(iconURL, title, desc);  
        }
        notify.show();
      }
      $scope.$apply();
      $('#messages').scrollTop($('#messages').prop("scrollHeight"));
    });
});
