require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   DATABASE
========================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('MongoDB Connected');
})
.catch(err => {
  console.error('MongoDB Error:', err.message);
});

/* =========================
   USER MODEL
========================= */

const User = mongoose.model('User', new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  xp: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

}));

/* =========================
   AUTH MIDDLEWARE
========================= */

function auth(req, res, next) {

  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      error: 'No token'
    });
  }

  try {

    const token = header.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch {

    return res.status(401).json({
      error: 'Invalid token'
    });

  }
}

/* =========================
   ROOT
========================= */

app.get('/', (req, res) => {

  res.json({
    message: 'TradeForge API Running'
  });

});

/* =========================
   SIGNUP
========================= */

app.post('/signup', async (req, res) => {

  try {

    const { name, email, password } = req.body;

    const existing =
      await User.findOne({ email });

    if (existing) {

      return res.status(400).json({
        error: 'Email already exists'
      });

    }

    const hashed =
      await bcrypt.hash(password, 10);

    const user = await User.create({

      name,
      email,
      password: hashed

    });

    const token = jwt.sign({

      id: user._id,
      email: user.email

    },

    process.env.JWT_SECRET,

    {

      expiresIn: '30d'

    });

    res.json({

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        xp: user.xp
      }

    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

/* =========================
   LOGIN
========================= */

app.post('/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    const user =
      await User.findOne({ email });

    if (!user) {

      return res.status(400).json({
        error: 'Invalid credentials'
      });

    }

    const valid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!valid) {

      return res.status(400).json({
        error: 'Invalid credentials'
      });

    }

    const token = jwt.sign({

      id: user._id,
      email: user.email

    },

    process.env.JWT_SECRET,

    {

      expiresIn: '30d'

    });

    res.json({

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        xp: user.xp
      }

    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

/* =========================
   PROFILE
========================= */

app.get('/profile', auth, async (req, res) => {

  try {

    const user =
      await User.findById(
        req.user.id
      ).select('-password');

    if (!user) {

      return res.status(404).json({
        error: 'User not found'
      });

    }

    res.json(user);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

/* =========================
   ADD XP
========================= */

app.post('/xp', auth, async (req, res) => {

  try {

    const amount =
      Number(req.body.amount || 0);

    const user =
      await User.findById(
        req.user.id
      );

    user.xp += amount;

    await user.save();

    res.json({

      xp: user.xp

    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

/* =========================
   SERVER
========================= */

const PORT =
  process.env.PORT || 10000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
