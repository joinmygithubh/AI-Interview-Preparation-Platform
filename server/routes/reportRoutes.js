import { Router } from 'express';

const router = Router();

// TODO: POST /:sessionId/generate, GET /:sessionId, GET /:sessionId/download
router.get('/', (req, res) => {
  res.json({ success: true, data: {}, message: 'report routes ready' });
});

export default router;
