import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { saveToken, removeToken } from '../lib/push';

const router = express.Router();

router.post('/token', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const userId = req.user?.userId;
    const memberId = req.user?.role === 'MEMBER' ? userId : undefined;
    const staffId = req.user?.role !== 'MEMBER' ? userId : undefined;

    saveToken(token, staffId, memberId, platform || 'ios');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to register token' });
  }
});

router.delete('/token', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (token) removeToken(token);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove token' });
  }
});

export default router;
