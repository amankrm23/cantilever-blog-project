const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// NEW: Import our security tools and User model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Post = require('./models/Post');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

// A secret key used to sign the VIP wristbands (JWTs). 
// In a real company, this is hidden in a .env file.
const JWT_SECRET = "cantilever_super_secret_key_123";

// ----------------------------------------------------
// FOLDER SETUP & STATIC SERVING
// ----------------------------------------------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// ----------------------------------------------------
// CONNECT TO MONGODB
// ----------------------------------------------------
// Correct Format:
mongoose.connect('mongodb+srv://amankrmurmu7777_db_user:nA0FJ2LwvEkVD709@cluster0.fghilmb.mongodb.net/blog_app?retryWrites=true&w=majority')
    .then(() => console.log("MongoDB is successfully connected!"))
    .catch((err) => console.log("Database connection error: ", err));

// ----------------------------------------------------
// NEW: AUTHENTICATION API ENDPOINTS (LOGIN / REGISTER)
// ----------------------------------------------------

// 1. REGISTER ROUTE
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if a user with this name already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already taken!" });
        }

        // Shred (hash) the password before saving it
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new user in the database
        const newUser = await User.create({
            username: username,
            password: hashedPassword
        });

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error registering user." });
    }
});

// 2. LOGIN ROUTE
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find the user in the database
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Invalid username or password!" });
        }

        // Compare the typed password with the shredded password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid username or password!" });
        }

        // If passwords match, create the VIP Wristband (JWT)
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

        // Send the token back to the frontend
        res.json({ message: "Login successful!", token: token, username: user.username });
    } catch (error) {
        res.status(500).json({ message: "Error logging in." });
    }
});

// ----------------------------------------------------
// POSTS API ENDPOINTS
// ----------------------------------------------------

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }); 
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching posts" });
    }
});

app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        let imagePath = null;
        if (req.file) {
            imagePath = `http://localhost:5000/uploads/${req.file.filename}`;
        }
        const newPost = await Post.create({
            title: req.body.title,
            content: req.body.content,
            imageUrl: imagePath 
        });
        res.json({ message: "Post saved permanently!", post: newPost });
    } catch (error) {
        res.status(500).json({ message: "Error saving post" });
    }
});

app.put('/api/posts/:id', upload.single('image'), async (req, res) => {
    try {
        let updateData = { title: req.body.title, content: req.body.content };
        if (req.file) updateData.imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, updateData, { new: true });
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

    const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});