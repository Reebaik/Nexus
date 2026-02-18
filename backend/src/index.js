import './config/env.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import googleAuthRoutes from './routes/googleAuth.js';
import projectsRoutes from './routes/projects.js';
import './listeners/slackListener.js';
import githubService from './services/githubService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));



app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/projects', projectsRoutes);
import githubRoutes from './routes/github.js';
app.use('/api/github', githubRoutes);
import aiRoutes from './routes/ai.js';
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.send('Nexus Backend API Running');
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    try {
      githubService.syncAllProjects().catch(() => {});
      setInterval(() => {
        githubService.syncAllProjects().catch(() => {});
      }, 15 * 60 * 1000);
    } catch {}
  });
})
.catch((err) => console.error('MongoDB connection error:', err));
