#!/bin/env node

var http        = require('http');
var path        = require('path');
var fs          = require('fs');
var async       = require('async');
var socketio    = require('socket.io');
var express     = require('express');
var router      = express();
var server      = http.createServer(router);
var io          = socketio.listen(server);

// Heroku doesn't support websockets on the Cedar stack yet
/*
io.configure(function () {
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});
*/

var sockets     = [];
var rooms       = {
    lobby: {
        name:       "Lobby",
        private:    false,
        users:      [],
        joined:     0,
        messages:   [],
        created:    new Date(),
        createdId:  null
    }
};
router.use(express.static(path.resolve(__dirname, 'client')));
/*
 * Simple Key/Pair Database files
 */
var Db = function(table){
    if ('string'!==typeof table)return;
    this.validJsonString = function(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    };
    this.dir = table;
    this.store = [];
    this.update = function(id,data){
        this.store[id] = data;
    };
};
Db.fn = Db.prototype = {
    get: function( id, callback ) {
        var fp = './db/'+this.dir+'/'+id+'.json';
        var self = this;
        fs.readFile(fp, 'utf8', function (err, data) {
            if(err) { 
                console.log(err);
                callback({});
            }
            else if ( self.validJsonString(data) ) {
                var row = JSON.parse(data);
                self.update(id, row);
                callback(row);
            }
        });
        return this;
    },
    set: function( id, data ) {
        var fp = './db/' + this.dir + '/' + id + '.json';
        var json = JSON.stringify(data);
        var self = this;
        fs.writeFile(fp, json, function (err) {
          if(err) console.log(err);
          self.update(id,data);
        });
        return this;
    }
};

/*
 * Broadcast an event to all users
 */
function emitEveryone(event, data) {
  io.sockets.emit(event,data);
}

io.on('connection', function (socket) {
    sockets.push(socket);
    var emitOthers = function(e,data) {
        socket.broadcast.emit(e,data);
    };
    var emitSelf = function(e,data) {
        socket.emit(e,data);
    };
    var roomEmitOthers = function(room,e,data) {
        socket.broadcast.to(room).emit(e,data);
    };
    var updateRecords = function() {
        async.map(
            sockets,
            function (socket, callback) {
                socket.get('profile', function (err, profile) {
                    if (err) console.log(err);
                    callback(null,{
                        id:     profile.id,
                        gid:    profile.gid,
                        name:   profile.name,
                        color:  profile.color,
                        image:  profile.image,
                        room:   profile.room
                    });

                });
            },
            function (err, users) {
                emitEveryone('users', users);
            }
        );
    };
    var sid = socket.id;
    var defaultProfile = {
            id:     sid,
            gid:    false,
            name:   String('Anonymous'),
            color:  String('#333'),
            image:  String('/asset/img/anonymous.gif'),
            room:   String('lobby'),
            settings: {
                notifications:  false,
                leave:          false,
                join:           true,
                login:          true,
                lobby:          false,
                messages:       10
            }
        };
    var preferences = new Db('preferences');
    /*
     * Frontend Loaded
     */
    socket.on('connect', function (sid) {
        socket.set('profile', defaultProfile );
        socket.get('profile', function(err,profile) {
            if (err) console.log(err);
            try {
                rooms.lobby.users.push(profile);
                socket.join('lobby');
                rooms.lobby.joined = rooms.lobby.users.length;
                emitEveryone('rooms', rooms);
                roomEmitOthers(profile.room,'roomUserJoin',profile);
                emitSelf('myProfile', profile);
                rooms[profile.room].messages.forEach(function (data) {
                    emitSelf('message', data);
                });
            } catch (e) {
                console.log(e);
            }
        });
        updateRecords();
    });
    /*
     * Google Login
     */
    socket.on('login', function (gapiData) {
        socket.get('profile', function (err, profile) {
            if (err) console.log(err);
            try {
                profile.gid = gapiData.id;
                profile.image = gapiData.image.url;
                preferences.get( gapiData.id, function(data) {
                    if (data.color) profile.color = data.color;
                    if (data.name) profile.name = data.name;
                    if (data.settings) profile.settings = data.settings;
                    socket.set('profile', profile, function (err) {
                        if (err) console.log(err);
                        updateRecords();
                        emitSelf('myProfile', profile);
                        roomEmitOthers(profile.room,'roomUserLogin',profile);
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
                rooms[profile.room].joined = rooms[profile.room].users.length;
                updateRecords();
                roomEmitOthers(profile.room,'roomUserLeft',profile);
                emitEveryone('rooms', rooms);
            } catch (e) {
                console.log(e);
            }
        });
    });
    /*
     * Rooms
     */
    socket.on('createRoom', function (room) {
        var lowerName = room.name.toLowerCase();
        if (!rooms[lowerName] || rooms[lowerName].createdId === sid) {
            rooms[lowerName] = {
                name:       room.name,
                private:    room.private,
                password:   String( room.password || ''),
                users:      [],
                joined:     0,
                messages:   [],
                created:    new Date(),
                createdId:  sid
            };
            emitEveryone('rooms', rooms);
        } else if (rooms[lowerName].createdId !== sid) {
            emitSelf('info','room exists');
        }
    });
    socket.on('editRoom', function (room) {
        var lowerName = room.name.toLowerCase();
        if (rooms[lowerName].createdId === sid) {
            rooms[lowerName].private = room.private;
            rooms[lowerName].password = room.password;
            emitEveryone('rooms', rooms);
        } else if (rooms[lowerName].createdId !== sid) {
            emitSelf('info','not allowed to edit');
        }
    });
    socket.on('joinRoom', function (room) {
        socket.get('profile', function(err,profile) {
            if (err) console.log(err);
            try {
                if ( ( !rooms[room.name].private ) || ( "undefined" !== typeof room.password && rooms[room.name].password === room.password ) ) {
                    rooms[profile.room].users.splice(rooms[profile.room].users.indexOf(profile), 1);
                    socket.leave(profile.room);
                    rooms[profile.room].joined = rooms[profile.room].users.length;
                    roomEmitOthers(profile.room,'roomUserLeft',profile);
        
                    rooms[room.name].users.push(profile);
                    socket.join(room.name);
                    rooms[room.name].joined = rooms[room.name].users.length;
                    roomEmitOthers(room.name,'roomUserJoin',profile);
        
                    profile.room = room.name;
                    emitSelf('myProfile', profile);
                    emitEveryone('rooms', rooms);
                    updateRecords();
                    rooms[profile.room].messages.forEach(function (data) {
                        emitSelf('message', data);
                    });
                } else {
                    emitSelf('info', "incorrect password");
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
            profile.settings = settings;
            socket.set('profile', profile, function (err) {
                if (err) console.log(err);
            });
            if (profile.gid) preferences.set( profile.gid, profile );
        });
    });
    socket.on('updateName', function (name) {
        socket.get('profile', function(err,profile) {
            if (err) console.log(err);
            profile.name = name;
            socket.set('profile', profile, function (err) {
                if (err) console.log(err);
                updateRecords();
            });
            if (profile.gid) preferences.set( profile.gid, profile );
        });
    });
    socket.on('updateColor', function (color) {
        socket.get('profile', function(err,profile) {
            if (err) console.log(err);
            profile.color = color;
            socket.set('profile', profile, function (err) {
                if (err) console.log(err);
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
                roomEmitOthers( profile.room , 'newMessage', resp );
                emitSelf( 'message' , resp );
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
server.listen(process.env.PORT || 80, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
