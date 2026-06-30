import multer from 'multer';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  const err = new Error('Only PDF and DOCX files are allowed');
  err.statusCode = 400;
  return cb(err, false);
};

/**
 * Multer middleware using in-memory storage so the buffer can be streamed
 * straight to Cloudinary / parsed without touching disk.
 */
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export default uploadMiddleware;
