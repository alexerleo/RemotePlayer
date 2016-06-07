var mongoose = require('mongoose');

var roomSchema = mongoose.Schema({
    user_id:{ type: String, required: true, index: { unique: true }  },
    email: String,
    password: String,
    devices:[{
        id: String,
        data: String
    }]
});
module.exports = mongoose.model('Users', roomSchema);
