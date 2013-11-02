/*
 * Simple Key/Pair Database files
 */
exports.ns = function(dir){
    var fs = require('fs');
    var path = require('path');
    var db_path = path.resolve(__dirname);

    if ('string'!==typeof dir)return;
    this.validJsonString = function(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    };
    this.dir = dir;
    this.store = [];
    this.exist = [];
    this.update = function(id,data){
        this.store[id] = data;
    };
    this.check = function( id, callback, data ) {
        if ( this.exist.indexOf(id) != -1 ) {
            if (callback) callback(true);
            return true;
        }
        var fp = db_path + '/'+this.dir+'/'+id+'.json';
        if ( fs.existsSync(fp) ) {
            this.exist.push(id);
            if (callback) callback(true);
            return true;
        } else {
            if (data) this.set( id , data , callback );
            return false;
        }
    };
    this.get = function( id, callback ) {
        if ( !this.store[id] ) {
            var fp = db_path + '/'+this.dir+'/'+id+'.json';
            var self = this;
            fs.readFile(fp, 'utf8', function (err, data) {
                if(err) { 
                    console.log(err);
                    if (callback) callback({});
                }
                else if ( self.validJsonString(data) ) {
                    var row = JSON.parse(data);
                    self.update(id, row);
                    callback(row);
                }
            });
        } else {
            callback(this.store[id]);
        }
        return this;
    };
    this.set = function( id, data, callback ) {
        var fp = db_path + '/' + this.dir + '/' + id + '.json';
        var json = JSON.stringify(data);
        var self = this;
        fs.writeFile(fp, json, function (err) {
            if(err) console.log(err);
            self.update(id,data);
            if (callback) callback();
        });
        return this;
    };
};