var crypto = require('crypto'),
    jwt = require('jsonwebtoken'),
    config = require('./config'),
    async = require('async'),
    xmlParse = require('xml2js'),
    User = require('../models/users'),
    Connection = require('../models/connection');

var service = function(){
    this.template =
        "<SocketMessage xmlns=\"http://schemas.datacontract.org/2004/07/Player.Models\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\">" +
            "<_stream i:nil=\"true\"/>" +
            "<alias i:nil=\"true\"/>" +
            "<contentType i:nil=\"true\"/>" +
            "<deviceId i:nil=\"true\"/>" +
            "<devices i:nil=\"true\"/>" +
            "<email i:nil=\"true\"/>" +
            "<message i:nil=\"true\"/>" +
            "<password i:nil=\"true\"/>" +
        "</SocketMessage>";
};
service.prototype.auth = function(data, callback){
    var self = this;
    this.parseRequest(data, function(parsed){
        var email = parsed.email[0];
        var password = parsed.password[0];
        var _callback = function(user){
            var token = self.generateToken(user);
            var msg = self.buildMessage(null, {
                message: "200"
            });
            callback({
                status: "200",
                data: msg,
                token: token,
                user: user
            });
        };
        User.findOne({email: email}, function(err, user){
            if(!user){
                var newUser = new User();
                newUser.email = email;
                newUser.password = password;
                newUser.devices = [];
                newUser.save();
                _callback(newUser);
            }
            else if(user.password != password){
                var msg = self.buildMessage(null, {
                    message: "401"
                });
                callback({
                    status: "401",
                    data: msg
                });
            }
            else {
                _callback(user);
            }
        })
    });
};

service.prototype.getDevices = function(data, user_id, callback) {
    var self = this;
    this.parseRequest(data, function(parsed) {
        var deviceId = parsed.deviceId[0];
        User.findOne({user_id: user_id}, function(err, user){
            try{
                var devices = user.devices.filter(function(e){
                    return e.id != deviceId;
                }).map(function(e){
                    return e.data;
                });
                var msg = self.buildMessage(data, {
                    devices: devices
                });
                callback({
                    msg: msg
                });
            }
            catch(err){
                callback({
                    error: true
                });
            }
        });
    });
};

service.prototype.getTrack = function(data, user_id, socket_id, callback){
    var self = this;
    this.parseRequest(data, function(parsed) {
        var deviceId = parsed.deviceId[0];
        var response = {};
        async.parallel([
            function (_callback) {
                Connection.findOne({
                    device_id: deviceId,
                    user_id: user_id
                }, function(err, con){
                    if(con){
                        response.id = con.connection_id;
                    }
                    _callback();
                });
            },
            function(_callback){
                Connection.findOne({
                    connection_id: deviceId,
                    user_id: user_id
                }, function(err, con){
                    if(con){
                        response.msg = self.buildMessage(data, {
                            deviceId: con.device_id
                        });
                    }
                    _callback();
                });
            }
        ],function(err){
            callback(response);
        });
    });
};

service.prototype.track = function(data, user_id, callback){
    this.parseRequest(data, function(parsed){
        var deviceId = parsed.deviceId[0];
        Connection.findOne({
            device_id: deviceId,
            user_id: user_id
        }, function(err, con){
            if(con){
                callback({
                    id: con.connection_id,
                    msg: data
                });
            }
        });
    });
};

service.prototype.device = function(data, user_id, callback){
    var deviceString = data.match(/<device>.*<\/device>/gi)[0];
    var self = this;
    this.parseRequest(data, function(parsed){
        var id = parsed.devices[0].Device[0].info[0]['a:id'][0];
        User.findOne({user_id: user_id}, function(err,user){
           try {
               var device = user.devices.filter(function(e){
                   return e.id == id;
               })[0];
               if(!device)
                   user.devices.push({
                       id: id,
                       data: deviceString
                   });
               else
                    device.data = deviceString;
               user.save(function(err){
                   var devices = user.devices.filter(function(e){
                       return e.id != device.id;
                   }).map(function(e){
                       return e.data;
                   });
                   var msg = self.buildMessage(null, {
                       devices: devices
                   });
                   callback({
                       msg: msg,
                       device_id: id
                   });
               });
           }
           catch(err)
           {
                callback({
                    error: true
                });
           }
        });
    });
};

service.prototype.generateToken = function(user){
    if (user.user_id == undefined || user.user_id == null) {
        var shasum = crypto.createHash('sha1');
        shasum.update(user._id + user.email);
        user.user_id = shasum.digest('hex');
        user.save();
    }
    return jwt.sign({
        user_id: user.user_id,
        name: user.email,
        role: 'owner',
        iss: 'remoteplayer.com',
        permissions: ['all']
    }, config.secret_key);
};

service.prototype.parseRequest = function(data, callback){
    xmlParse.parseString(data, function(err, parsed){
        callback(parsed.SocketMessage);
    });
};

service.prototype.parseToken = function(socket,callback,error_callback){
    jwt.verify(socket.token, config.secret_key, function(err, decoded) {
        if (err) {
            if(!error_callback){
                return;
            }
            error_callback();
        }
        socket.user_id = decoded.user_id;
        callback(decoded);
    });
};

service.prototype.buildMessage = function(message, options){
    var msg = message || this.template;

    if(options.deviceId){
        var deviceId = msg.match(/<deviceId.*(\/>|<\/deviceId>)/i)[0];
        msg = msg.replace(deviceId, "<deviceId>" + options.deviceId + "</deviceId>");
    }
    if(options.alias) {
        var alias = msg.match(/<alias.*(\/>|<\/alias>)/i)[0];
        msg = msg.replace(alias, "<alias>" + options.alias + "</alias>");
    }
    if(options.contentType) {
        var contentType = msg.match(/<contentType.*(\/>|<\/contentType>)/i)[0];
        msg = msg.replace(contentType, "<contentType>" + options.contentType + "</contentType>");
    }
    if(options.stream) {
        var stream = msg.match(/<_stream.*(\/>|<\/_stream>)/i)[0];
        msg = msg.replace(stream, "<stream>" + options.stream + "</stream>");
    }
    if(options.devices) {
        var devices = msg.match(/<devices.*(\/>|<\/devices>)/i)[0];
        msg = msg.replace(devices, "<devices>" + options.devices.join('') + "</devices>");
    }
    if(options.message){
        var message = msg.match(/<message.*(\/>|<\/message>)/i)[0];
        msg = msg.replace(message, "<message>" + options.message + "</message>");
    }

    return msg;
};

module.exports = service;