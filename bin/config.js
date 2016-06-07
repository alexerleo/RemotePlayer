var config = {};
config.secret_key = 'secret_key';

// mongodb configuration
config.mongodb = {};
config.mongodb.host = process.env.MONGODB_HOST || '127.0.0.1';
config.mongodb.port = process.env.MONGODB_PORT || 27017;
config.mongodb.user = process.env.MONGODB_USERNAME || 'remotePlayerAdmin';
config.mongodb.password = process.env.MONGODB_PASSWORD || 'acIm1n';
config.mongodb.database = process.env.MONGODB_DATABASE || 'remote';
config.mongodb.random = process.env.MONGODB_RANDOM || "no_sync";

module.exports = config;