const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer'); // NEW: The file handler
const path = require('path');
const fs = require('fs');
const Post = require('./models/Post');

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// NEW: FOLDER SETUP & STATIC SERVING
// ----------------------------------------------------
// 1. Create an "uploads" folder automatically if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// 2. Tell Express to make the "uploads" folder publicly accessible via URL
app.use('/uploads', express.static(uploadDir));

// 3. Configure Multer (Where to park the files, and what to name them)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // Adds a timestamp to the image name so we never have duplicate names!
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });


// ----------------------------------------------------
// CONNECT TO MONGODB
// ----------------------------------------------------
mongoose.connect('mongodb://127.0.0.1:27017/blog_app')
    .then(() => console.log("MongoDB is successfully connected!"))
    .catch((err) => console.log("Database connection error: ", err));


// ----------------------------------------------------
// THE API ENDPOINTS
// ----------------------------------------------------

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }); 
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching posts" });
    }
});

// NEW: We added `upload.single('image')` to intercept the file BEFORE saving to DB
app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        // Check if an image was uploaded, if so, generate its URL
        let imagePath = null;
        if (req.file) {
            imagePath = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        const newPost = await Post.create({
            title: req.body.title,
            content: req.body.content,
            imageUrl: imagePath // Save the parking ticket to MongoDB
        });
        
        res.json({ message: "Post saved permanently!", post: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving post" });
    }
});

app.put('/api/posts/:id', upload.single('image'), async (req, res) => {
    try {
        let updateData = {
            title: req.body.title,
            content: req.body.content
        };

        // If a new image is uploaded during the edit, update the image URL
        if (req.file) {
            updateData.imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id, 
            updateData,
            { new: true } 
        );
        res.json({ message: "Post updated successfully!", post: updatedPost });
    } catch (error) {
        res.status(500).json({ message: "Error updating post" });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: "Post deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting post" });
    }
});

app.listen(5000, () => {
    console.log("Server is running on http://localhost:5000");
});