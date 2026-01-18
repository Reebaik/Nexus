import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Google OAuth login
router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ message: 'Google account email not found.' });
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      // Auto-create user
      user = new User({
        username: payload.email.split('@')[0],
        email: payload.email,
        password: Math.random().toString(36), // random password, not used
      });
      await user.save();
    }
    const jwtToken = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: jwtToken, user: { username: user.username, email: user.email, id: user._id } });
  } catch (err) {
    res.status(401).json({ message: 'Invalid Google token.' });
  }
});

export default router;
