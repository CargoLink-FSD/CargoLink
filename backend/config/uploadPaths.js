import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isAppEngineRuntime = Boolean(process.env.GAE_ENV || process.env.GOOGLE_CLOUD_PROJECT);

const uploadRoot =
  process.env.UPLOAD_ROOT ||
  (isAppEngineRuntime ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'uploads'));

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

export const getUploadRoot = () => {
  if (process.env.GCS_BUCKET) return uploadRoot; // GCS mode — skip mkdir
  return ensureDirectory(uploadRoot);
};

export const ensureUploadSubdir = (subdirName) => {
  const root = getUploadRoot();
  return ensureDirectory(path.join(root, subdirName));
};
