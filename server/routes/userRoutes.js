import { Router } from 'express';

const router = Router();

// TODO: GET /profile, PUT /profile, PUT /avatar (upload), GET /stats
router.get('/', (req, res) => {
  res.json({ success: true, data: {}, message: 'user routes ready' });
});

export default router;
