/** @format */

const { Router } = require('express');
const router = Router();
const config = require('config');
const { User } = require('../models');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.user.userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { id, name, phone, email } = user;

    res.status(200).json({ id, name, phone, email });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Register
router.post(
  '/register',
  [
    check('name', 'Please enter your name').not().isEmpty().trim().isLength({
      min: 3,
    }),
    check('email', 'Wrong current email').isEmail(),
    check('password', 'Wrong current password').isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(422).json({
          field: errors.array()[0].param,
          message: errors.array()[0].msg,
        });
      }

      const { phone, name, email, password } = req.body;

      const isExists = await User.findOne({ where: { email } });

      const hashedPassword = await bcrypt.hash(password, 10);

      if (isExists) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = await User.create({
        phone,
        name,
        email,
        password: hashedPassword,
      });

      const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
        expiresIn: '7d',
      });

      res.status(200).json({
        token,
      });
    } catch (e) {
      res.status(500).json({ error: 'Something went wrong' });
    }
  },
);

// Login
router.post(
  '/login',
  [
    check('email', 'Please enter a valid email').normalizeEmail().isEmail(),
    check('password', 'Please enter Password').exists(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(422).json({
          field: errors.array()[0].param,
          message: errors.array()[0].msg,
        });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).send();
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!user || !isMatch) {
        return res.status(422).json({
          field: !user ? 'email' : !isMatch ? 'password' : '',
          message: 'Wrong email or password',
        });
      }

      const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
        expiresIn: '7d',
      });

      res.status(200).json({
        token,
      });
    } catch (e) {
      res.status(500).json({ error: 'Something went wrong' });
    }
  },
);

module.exports = router;
