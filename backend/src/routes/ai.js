import express from 'express';
import { getExecutiveBrief } from '../controllers/aiController.js';

const router = express.Router();

router.post('/executive-brief/:projectId', getExecutiveBrief);

export default router;
