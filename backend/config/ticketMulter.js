import multer from 'multer';
import path from 'path';

// Use in-memory storage — files are buffered and then uploaded to GCS
// by the gcsUpload middleware (or kept in memory for local dev).
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (mimeOk && extOk) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed'));
};

const ticketUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});

export default ticketUpload;
