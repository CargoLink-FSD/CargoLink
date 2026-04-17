import path from 'path';
import { getGcsBucket, uploadBufferToGcs } from '../core/storage.js';
import { logger } from '../utils/misc.js';

/**
 * Creates an Express middleware that uploads multer-buffered files to GCS.
 *
 * @param {string} folder - Subfolder inside the GCS bucket (e.g. 'profile-pictures')
 * @returns {Function} Express middleware
 *
 * When `GCS_BUCKET` is NOT set the middleware is a no-op so local dev
 * continues to work with disk-based uploads (or memoryStorage buffers).
 */
const gcsUpload = (folder) => {
  return async (req, _res, next) => {
    const bucket = getGcsBucket();
    if (!bucket) return next(); // local dev — skip GCS

    try {
      // Handle single file (req.file)
      if (req.file) {
        await uploadSingleFile(req.file, bucket, folder);
      }

      // Handle multiple files (req.files — object keyed by fieldname)
      if (req.files && typeof req.files === 'object') {
        const fileGroups = Array.isArray(req.files) ? { files: req.files } : req.files;
        for (const [fieldName, files] of Object.entries(fileGroups)) {
          for (const file of files) {
            const subFolder = resolveFolder(folder, fieldName);
            await uploadSingleFile(file, bucket, subFolder);
          }
        }
      }

      next();
    } catch (err) {
      logger.error('GCS upload middleware error', { error: err.message, folder });
      next(err);
    }
  };
};

/**
 * Uploads a single multer file object to GCS and decorates it with `publicUrl`.
 */
async function uploadSingleFile(file, bucket, folder) {
  // Generate a unique filename preserving the original extension
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname);
  const gcsFilename = `${uniqueSuffix}${ext}`;

  const publicUrl = await uploadBufferToGcs(bucket, folder, gcsFilename, file.buffer, file.mimetype);

  // Attach the GCS URL so downstream controllers/services can use it
  file.publicUrl = publicUrl;
  // Also update filename for backward-compatible code paths
  file.filename = gcsFilename;
}

/**
 * Resolves the GCS folder — for multi-field uploads (documents) the folder
 * is already correct because each multer config maps to a specific folder.
 */
function resolveFolder(baseFolder, _fieldName) {
  return baseFolder;
}

export default gcsUpload;
