import { Router } from 'express';

const router = Router();

// TODO: POST /upload (multer), GET /, GET /:id, DELETE /:id
router.get('/', (req, res) => {
  res.json({ success: true, data: {}, message: 'resume routes ready' });
});

export default router;
