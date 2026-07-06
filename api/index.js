require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-productivity-key';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/productivity-tracker';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  tracker_data: { type: String, default: null }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.userId = user.userId;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const hash = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password_hash: hash });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Registration successful', token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  // Client handles token deletion
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- DATA ENDPOINTS ---

app.get('/api/data', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    let data = null;
    if (user.tracker_data) {
      try {
        data = JSON.parse(user.tracker_data);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/data', authenticateJWT, async (req, res) => {
  try {
    const trackerDataStr = JSON.stringify(req.body);
    await User.findByIdAndUpdate(req.userId, { tracker_data: trackerDataStr });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// --- AI NUTRITION ENDPOINT ---
app.post('/api/nutrition/parse', authenticateJWT, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text input required' });

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in .env' });
  }

  try {
    const prompt = \`You are a nutrition API. Given the following user input about what they ate, extract the total estimated nutritional information. Return ONLY a valid JSON object with no markdown formatting and no extra text.
    Format: {"food": "String describing the food simply", "calories": Number, "protein": Number (grams), "fats": Number (grams), "fiber": Number (grams)}. If multiple items, combine them into one total JSON object.
    Input: "\${text}"\`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text);
    res.json(data);
  } catch (err) {
    console.error('Error parsing nutrition:', err);
    res.status(500).json({ error: 'Failed to parse nutrition data' });
  }
});

// For local testing (Vercel will export the app instead)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(\`Server running locally on http://localhost:\${PORT}\`);
  });
}

// Export the app for Vercel serverless functions
module.exports = app;
