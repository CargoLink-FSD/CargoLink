import multer from 'multer';
import path from 'path';
import { ensureUploadSubdir } from './uploadPaths.js';

const uploadsDir = ensureUploadSubdir('driver-docs');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `driver-${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

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
