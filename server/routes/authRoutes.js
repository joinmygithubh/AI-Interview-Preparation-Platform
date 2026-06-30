import { Router } from 'express';

const router = Router();

// TODO: POST /register, POST /login, GET /me, POST /logout
router.get('/', (req, res) => {
  res.json({ success: true, data: {}, message: 'auth routes ready' });
});

export default router;
