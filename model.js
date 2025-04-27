const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // Document will be removed after 24 hours (86400 seconds)
    },
});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
