import { Storage } from '@google-cloud/storage';
import path from 'path';
import { logger } from '../utils/misc.js';

let storageClient = null;

/**
 * Lazily initialises and returns the GCS Storage client.
 * Uses Application Default Credentials (automatic on Cloud Run).
 */
const getClient = () => {
  if (!storageClient) {
    storageClient = new Storage();
  }
  return storageClient;
};

/**
 * Returns the configured GCS bucket name, or null when running locally.
 */
export const getGcsBucket = () => process.env.GCS_BUCKET || null;

/**
 * Uploads a buffer to Google Cloud Storage and returns the public URL.
 *
 * @param {string} bucketName  - GCS bucket name
 * @param {string} folder      - Subfolder inside the bucket (e.g. 'profile-pictures')
 * @param {string} filename    - Destination filename
 * @param {Buffer} buffer      - File contents
 * @param {string} mimetype    - MIME type of the file
 * @returns {Promise<string>}  - Public URL of the uploaded object
 */
export const uploadBufferToGcs = async (bucketName, folder, filename, buffer, mimetype) => {
  const client = getClient();
  const bucket = client.bucket(bucketName);
  const objectPath = folder ? `${folder}/${filename}` : filename;
  const file = bucket.file(objectPath);

  await file.save(buffer, {
    metadata: { contentType: mimetype },
    resumable: false,          // small files — no need for resumable
    public: true,              // make immediately accessible
  });

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
  logger.info('Uploaded file to GCS', { bucket: bucketName, path: objectPath });
  return publicUrl;
};
