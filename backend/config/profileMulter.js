import multer from 'multer';
import path from 'path';

// Use in-memory storage — files are buffered and then uploaded to GCS
// by the gcsUpload middleware (or kept in memory for local dev).
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed!'));
    }
};

// Create multer upload instance for profile pictures
const profileUpload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max file size for profile pictures
    },
    fileFilter: fileFilter
});

export default profileUpload;
