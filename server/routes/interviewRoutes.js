import { Router } from 'express';

const router = Router();

// TODO: POST / (create session), GET /, GET /:id, POST /:id/answer, POST /:id/complete
router.get('/', (req, res) => {
  res.json({ success: true, data: {}, message: 'interview routes ready' });
});

export default router;
