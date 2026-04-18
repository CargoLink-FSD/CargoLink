import multer from 'multer';
import path from 'path';

// Use in-memory storage — files are buffered and then uploaded to GCS
// by the gcsUpload middleware (or kept in memory for local dev).
const storage = multer.memoryStorage();

// File filter to accept images and PDFs
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png)|application\/pdf/.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG) and PDF files are allowed for documents!'));
    }
};

const driverDocUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});

export default driverDocUpload;
