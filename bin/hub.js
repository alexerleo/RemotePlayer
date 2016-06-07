var socket_io = require('socket.io'),    
    fs = require('fs'),
    options = {stream: fs.createWriteStream('remote_events.log',{flags:'a'}) },    
    logger = require('socket.io-logger')(options),
    Service = require('./service'),
    service = new Service(),
    User = require('../models/users'),
    connection = require('../models/connection');

var hub = {};

hub.init = function(server){
    hub.io = socket_io(server);
    hub.io.use(function(socket, next) {
        connection.findOne({connection_id: socket.id}, function(err, connectionStore){
            if (err || !connectionStore) {
                console.log(err);
            }
            console.log(socket.id);
            console.log(connectionStore);
        });

        next();
    });
    hub.io.on('connection', function(socket){
        socket.on('disconnect', function(){
            console.log('on disconnect');
            connection.findOne({connection_id: socket.id}, function(err, con){
                if(con) {
                    service.parseToken(socket, function(decoded) {
                        User.findOne({user_id: decoded.user_id}, function (err, user) {
                            try {
                                user.devices = user.devices.filter(function(e){
                                    return e.device_id != con.device_id
                                });
                                user.save();
                            }
                            catch(err) {

                            }
                            finally {
                                con.remove();
                            }
                        });
                    });
                }
            });
        });

        socket.on('Auth', function (data) {
            service.auth(data, function(data)
            {
                if(data.status == "200") {
                    socket.token = data.token;
                    // Storing connection details
                    var connectionStore = new connection({
                        connection_id: socket.id,
                        user_id: data.user.user_id
                    });
                    connectionStore.save();
                }
                socket.emit("Auth", data.data);        
            });
        });

        socket.on('Device', function(data){
            service.parseToken(socket, function (decoded) {
                service.device(data, decoded.user_id, function(data){
                    if(!data.error) {
                        connection.findOne({
                            user_id: decoded.user_id,
                            connection_id: socket.id
                        }, function(err, con){
                            con.device_id = data.id;
                            con.save();
                            socket.emit('Devices', data.msg);
                        });
                    }
                });
            }, function(){

            });
        });
        
        socket.on('GetDevices', function(data){
            service.parseToken(socket, function (decoded) {
                service.getDevices(data, decoded.user_id, function (data) {
                    if(!data.error)
                        socket.emit('Devices', data.msg);
                });
            }, function(){

            });
        });

        socket.on('Track', function(data){
            service.parseToken(socket, function (decoded) {
                service.track(data, decoded.user_id, function (data) {
                    if(!data.error)
                        socket.to(data.id).emit('Track', data.msg);
                });
            }, function(){

            });
        });

        socket.on('GetTrack', function(data){
            service.parseToken(socket, function (decoded) {
                service.getTrack(data, decoded.user_id, socket.id, function (data) {
                    if(!data.error)
                        socket.to(data.id).emit('GetTrack', data.msg);
                });
            }, function(){

            });
        });
    });
};

module.exports = hub;