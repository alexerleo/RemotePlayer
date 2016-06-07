var mongoose = require('mongoose');

var connectionSchema = mongoose.Schema({
    connection_id:{ type: String, required: true, index: { unique: true }  },
    user_id: {type: String},
    device_id: {type: String}
});
module.exports = mongoose.model('Connection', connectionSchema);