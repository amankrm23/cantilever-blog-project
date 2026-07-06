const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // NEW: We will store the path to the image here
    imageUrl: {
        type: String,
        required: false // Not every post needs an image
    }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);