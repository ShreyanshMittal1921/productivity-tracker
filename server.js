require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// Connect to SQLite DB
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        tracker_data TEXT
      )
    `);
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'super-secret-productivity-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password_hash, tracker_data) VALUES (?, ?, ?)', [username, hash, null], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Internal server error' });
      }
      req.session.userId = this.lastID;
      res.json({ message: 'Registration successful' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT id, password_hash FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!row) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.userId = row.id;
    res.json({ message: 'Login successful' });
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session.userId) {
    db.get('SELECT username FROM users WHERE id = ?', [req.session.userId], (err, row) => {
      if (err || !row) return res.status(401).json({ error: 'Not authenticated' });
      res.json({ username: row.username });
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// --- DATA ENDPOINTS ---

// Get user tracker data
app.get('/api/data', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });

  db.get('SELECT tracker_data FROM users WHERE id = ?', [req.session.userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    let data = null;
    try {
      if (row && row.tracker_data) {
        data = JSON.parse(row.tracker_data);
      }
    } catch (e) {
      console.error('Failed to parse user data');
    }
    res.json({ data });
  });
});

// Save user tracker data
app.post('/api/data', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });

  const trackerDataStr = JSON.stringify(req.body);
  db.run('UPDATE users SET tracker_data = ? WHERE id = ?', [trackerDataStr, req.session.userId], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save data' });
    res.json({ success: true });
  });
});

// --- AI NUTRITION ENDPOINT ---
app.post('/api/nutrition/parse', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text input required' });

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in .env' });
  }

  try {
    const prompt = `You are a nutrition API. Given the following user input about what they ate, extract the total estimated nutritional information. Return ONLY a valid JSON object with no markdown formatting and no extra text.
    Format: {"food": "String describing the food simply", "calories": Number, "protein": Number (grams), "fats": Number (grams), "fiber": Number (grams)}. If multiple items, combine them into one total JSON object.
    Input: "${text}"`;

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

// Handle missing routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
