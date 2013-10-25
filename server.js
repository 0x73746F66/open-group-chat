#!/bin/env node

var http        = require('http');
var fs          = require('fs');
var path        = require('path');
var async       = require('async');
var socketio    = require('socket.io');
var express     = require('express');
var db          = require('./db/db');
var preferences = new db.ns('preferences');
var roomsDb     = new db.ns('rooms');
var app         = require('./helpers/app');
var router      = express();
var server      = http.createServer(router);
var io          = socketio.listen(server);

var sockets     = [];
var rooms       = {};
fs.readdir(__dirname+'/db/rooms', function(err,files){
    if (err) console.log(err);
    files.forEach(function(fineName){
        var roomName = fineName.replace('.json','');
        roomsDb.get( roomName , function(data) {
            rooms[roomName] = data;
        });
    });
});
router.use(express.static(path.resolve(__dirname, 'client')));

/* Heroku doesn't support websockets on the Cedar stack yet
io.configure(function () {
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
}); */

/*
 * Broadcast an event to all users
 */
function updateRecords() {
    async.map(
        sockets,
        function (socket, callback) {
            socket.get('profile', function (err, profile) {
                if (err) console.log(err);
                callback(null,profile);
            });
        },
        function (err, users) {
            io.sockets.emit('users', users);
        }
    );
};

io.on('connection', function (socket) {
    // emitOthers                                    socket.broadcast.emit(e,data);
    sockets.push(socket);
    socket.on('connect', function (profile) {
        try {
            if (profile == {} || !profile.gid) {
                var profile = app.defaultProfile();
                socket.set('profile', profile );
                socket.emit('checkLogin', {});
            } else if ( profile.gid ) {
                preferences.get( profile.gid, function(data) {
                    socket.set('profile', data, function (err) {
                        if (err) console.log(err);
                        rooms[profile.room].users.push(profile);
                        socket.join(profile.room);
                        io.sockets.emit('rooms', rooms);
                        socket.broadcast.to(profile.room).emit('roomUserJoin',profile);
                        socket.emit('myProfile', profile);
                        rooms[profile.room].messages.forEach(function (message) {
                            socket.emit('message', message);
                        });
                        updateRecords();
                    });
                });
            }
        } catch (e) {
            console.log(e);
        }
    });
    /*
     * Google Login
     */
    socket.on('login', function (gapiData) {
        socket.get('profile', function (err, profile) {
            if (err) console.log(err);
            try {
                rooms[profile.room].users.splice(rooms[profile.room].users.indexOf(profile), 1);
                profile.gid     = gapiData.id;
                profile.image   = gapiData.image.url;
                preferences.get( gapiData.id, function(data) {
                    if (data.color) profile.color = data.color;
                    if (data.name) profile.name = data.name;
                    if (data.settings) profile.settings = data.settings;
                    if (data.room && data.room != profile.room) {
                        socket.leave(profile.room);
                        socket.join(data.room);
                        profile.room = data.room;
                    }
                    socket.set('profile', profile, function (err) {
                        if (err) console.log(err);
                        socket.emit('myProfile', profile);
                        rooms[profile.room].messages.forEach(function (message) {
                            socket.emit('message', message);
                        });
                        socket.emit('login', profile);
                        rooms[profile.room].users.push(profile);
                        socket.broadcast.to(profile.room).emit('roomUserLogin',profile);
                        io.sockets.emit('rooms', rooms);
                        updateRecords();
                    });
                    preferences.set( gapiData.id, profile );
                });
            } catch (e) {
                console.log(e);
            }
        });
    });
    /*
     * User Closed App
     */
    socket.on('disconnect', function () {
        sockets.splice(sockets.indexOf(socket), 1);
        socket.get('profile', function (err, profile) {
            if (err) console.log(err);
            try{ 
                rooms[profile.room].users.splice(rooms[profile.room].users.indexOf(profile), 1);
                updateRecords();
                socket.broadcast.to(profile.room).emit('roomUserLogout',profile);
                io.sockets.emit('rooms', rooms);
            } catch (e) {
                console.log(e);
            }
        });
    });
    /*
     * Rooms
     */
    socket.on('createRoom', function (room) {
        try{ 
            var roomId = app.camelcase(room.name);
            socket.get('profile', function (err, profile) {
                if (err) console.log(err);
                if ( !rooms[roomId] ) {
                    rooms[roomId] = {
                        id:         roomId,
                        name:       room.name,
                        private:    room.private,
                        password:   String( room.password || ''),
                        users:      [],
                        messages:   [],
                        created:    new Date(),
                        creator:    profile.gid,
                        admins:     [profile.gid]
                    };
                    roomsDb.set( roomId, rooms[roomId]  );
                    io.sockets.emit('rooms', rooms);
                } else {
                    socket.emit('info', room.name + ' exists');
                }
            });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on('editRoom', function (room) {
        try{ 
            var roomId = app.camelcase(room.name);
            socket.get('profile', function (err, profile) {
                if (err) console.log(err);
                if (rooms[roomId].creator === profile.gid || rooms[roomId].admins.indexOf(profile.gid) >= 0 ) {
                    rooms[roomId].private = room.private;
                    rooms[roomId].password = room.password;
                    io.sockets.emit('rooms', rooms);
                    roomsDb.get( roomId , function(data) {
                        data.private = rooms[roomId].private;
                        data.password = rooms[roomId].password;
                        roomsDb.set( roomId , data );
                    });
                } else {
                    socket.emit('info','permission denied' );
                }
            });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on('revokeAdmin', function (data) {
        try{
            rooms[data.room].admins.splice(rooms[data.room].admins.indexOf(data.gid), 1);
            io.sockets.emit('rooms', rooms);
            roomsDb.get( data.room , function(room) {
                room.admins = rooms[data.room].admins;
                roomsDb.set( data.room , room );
            });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on('makeAdmin', function (data) {
        try{
            rooms[data.room].admins.push(data.gid);
            io.sockets.emit('rooms', rooms);
            roomsDb.get( data.room , function(room) {
                room.admins = rooms[data.room].admins;
                roomsDb.set( data.room , room );
            });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on('kick', function (data) {
        try{
            sockets.forEach(function(socketTemp){
                socketTemp.get('profile', function (err, profileTemp) {
                    if (err) console.log(err);
                    if ( profileTemp.gid == data.gid ) {
                        rooms[data.room].users.splice(rooms[data.room].users.indexOf(profileTemp), 1);
                        socketTemp.leave(data.room);
                        socketTemp.broadcast.to(data.room).emit(data.room,'roomUserLeft',profileTemp);
            
                        rooms['Lobby'].users.push(profileTemp);
                        socketTemp.join('Lobby');
                        socketTemp.broadcast.to('Lobby').emit('roomUserJoin',profileTemp);
            
                        profileTemp.room = "Lobby";
                        socketTemp.emit('myProfile', profileTemp);
                        io.sockets.emit('rooms', rooms);
                        rooms['Lobby'].messages.forEach(function (message) {
                            socketTemp.emit('message', message);
                        });
                        socketTemp.set('profile', profileTemp, function (err) {
                            if (err) console.log(err);
                            updateRecords();
                        });
                    }
                });
            });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on('joinRoom', function (room) {
        socket.get('profile', function(err,profile) {
            if (err) console.log(err);
            try {
                if ( ( !rooms[room.id].private ) || ( "undefined" !== typeof room.password && rooms[room.id].password === room.password ) ) {
                    rooms[profile.room].users.splice(rooms[profile.room].users.indexOf(profile), 1);
                    socket.leave(profile.room);
                    socket.broadcast.to(profile.room).emit(profile.room,'roomUserLeft',profile);
        
                    rooms[room.id].users.push(profile);
                    socket.join(room.id);
                    socket.broadcast.to(room.id).emit('roomUserJoin',profile);
        
                    profile.room = room.id;
                    socket.emit('myProfile', profile);
                    io.sockets.emit('rooms', rooms);
                    updateRecords();
                    rooms[profile.room].messages.forEach(function (data) {
                        socket.emit('message', data);
                    });
                    socket.set('profile', profile, function (err) {
                        if (err) console.log(err);
                        updateRecords();
                    });
                } else {
                    socket.emit('info', "incorrect password");
                }
            } catch (e) {
                console.log(e);
            }
        });
    });
    /*
     * Profile Updates
     */
    socket.on('saveSettings', function (settings) {
        socket.get('profile', function(err,profile) {
            if (err) console.log(err);
            rooms[profile.room].users.splice(rooms[profile.room].users.indexOf(profile), 1);
            profile.color = settings.color;
            profile.name = settings.name;
            profile.url = settings.url;
            profile.settings = settings;
            socket.set('profile', profile, function (err) {
                if (err) console.log(err);
                rooms[profile.room].users.push(profile);
                io.sockets.emit('rooms', rooms);
                updateRecords();
            });
            if (profile.gid) preferences.set( profile.gid, profile );
        });
    });
    /*
     * New Message
     */
    socket.on('message', function (text) {
        var resp = {
          text: String(text || '')
        };
        socket.get('profile', function(err,profile) {
            if (err) console.log(err);
            try {
                resp.color = profile.color;
                resp.name  = profile.name;
                resp.image = profile.image;
                socket.broadcast.to(profile.room).emit('newMessage', resp );
                socket.emit( 'message' , resp );
                rooms[profile.room].messages.push(resp);
                if ( rooms[profile.room].messages.length > 10 ) {
                    rooms[profile.room].messages = rooms[profile.room].messages.slice(1,11);
                }
            } catch (e) {
                console.log(e);
            }
        });
    });

});
server.listen(process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 80, process.env.OPENSHIFT_NODEJS_IP || process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
