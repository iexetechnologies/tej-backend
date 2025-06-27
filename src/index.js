const cors = require('cors');
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const auth = require('./middleware/auth');
const { authenticate, authorizeRoles } = require('./middleware/auth');



const app = express();
app.use(express.json());

app.use(cors({
  origin: '*', // ⚠️ for dev only — allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
console.log("🔍 DATABASE_URL from env:", process.env.DATABASE_URL);


// Register
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
        [username, hash, role || 'user']
      );
      
    res.json(result.rows[0]);
  } catch (err) {
    console.error('🔴 Full DB Error:', err);
    res.status(400).json({ error: err.detail || err.message || 'Registration failed' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token });
});



//User
app.get('/user', auth, (req, res) => {
  res.json({
    username: req.user.username,
    role: req.user.role
  });
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



