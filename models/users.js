var mongoose = require('mongoose');

var roomSchema = mongoose.Schema({
    user_id:{ type: String, required: true, index: { unique: true }  },
    email:{ type: String, required: true, unique: true },
    password: { type: String, required: true },
    devices:[{
        id: String,
        data: String
    }]
});
module.exports = mongoose.model('Users', roomSchema);
