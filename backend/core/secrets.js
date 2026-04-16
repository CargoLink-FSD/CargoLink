import { logger } from '../utils/misc.js';

const getProjectId = () =>
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

const resolveSecretVersionPath = ({ projectId, secretName, secretVersion }) => {
  if (secretName.startsWith('projects/')) {
    return secretName.includes('/versions/') ? secretName : `${secretName}/versions/${secretVersion}`;
  }

  if (!projectId) {
    throw new Error(
      'Secret name is not a full resource path and no project id was found in environment variables.',
    );
  }

  return `projects/${projectId}/secrets/${secretName}/versions/${secretVersion}`;
};

/**
 * Fetches a single secret value from Secret Manager.
 * @param {string} secretName  - The secret's short name (e.g. "MONGO_URI")
 * @param {string} [secretVersion] - Defaults to "latest"
 * @returns {Promise<string>}
 */
const fetchSecret = async (secretName, secretVersion = 'latest') => {
  const projectId = getProjectId();
  const secretPath = resolveSecretVersionPath({ projectId, secretName, secretVersion });

  const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();
  const [response] = await client.accessSecretVersion({ name: secretPath });
  const value = response.payload?.data?.toString('utf8').trim();

  if (!value) {
    throw new Error(`Secret ${secretPath} is empty.`);
  }

  return value;
};

/**
 * Resolves the MongoDB URI from Secret Manager or falls back to the env var.
 * Called explicitly from server.js (kept for backward compat).
 */
export const resolveMongoUri = async (fallbackMongoUri) => {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const secretName = process.env.MONGO_URI_SECRET_NAME;
  if (!secretName) {
    return fallbackMongoUri;
  }

  const secretVersion = process.env.MONGO_URI_SECRET_VERSION || 'latest';

  try {
    const mongoUri = await fetchSecret(secretName, secretVersion);
    logger.info('Loaded MongoDB URI from Secret Manager.');
    return mongoUri;
  } catch (error) {
    logger.error('Failed to load MongoDB URI from Secret Manager.', {
      error: error?.message || String(error),
      secretName,
    });
    throw error;
  }
};

/**
 * Mapping of  env var name  →  secret-name pointer env var
 * If the env var is already set (e.g. in local dev), it is NOT overwritten.
 * If the pointer env var exists, the secret is fetched and injected.
 */
const SECRET_MAP = [
  { envVar: 'MONGO_URI',           pointerVar: 'MONGO_URI_SECRET_NAME',           versionVar: 'MONGO_URI_SECRET_VERSION' },
  { envVar: 'JWT_ACCESS_SECRET',   pointerVar: 'JWT_ACCESS_SECRET_NAME' },
  { envVar: 'JWT_REFRESH_SECRET',  pointerVar: 'JWT_REFRESH_SECRET_NAME' },
  { envVar: 'GOOGLE_CLIENT_ID',    pointerVar: 'GOOGLE_CLIENT_ID_SECRET_NAME' },
  { envVar: 'ADMIN_EMAIL',         pointerVar: 'ADMIN_EMAIL_SECRET_NAME' },
  { envVar: 'ADMIN_PASSWORD',      pointerVar: 'ADMIN_PASSWORD_SECRET_NAME' },
  { envVar: 'RAZORPAY_KEY_ID',     pointerVar: 'RAZORPAY_KEY_ID_SECRET_NAME' },
  { envVar: 'RAZORPAY_KEY_SECRET', pointerVar: 'RAZORPAY_KEY_SECRET_SECRET_NAME' },
  { envVar: 'GOOGLE_MAPS_API_KEY', pointerVar: 'GOOGLE_MAPS_API_KEY_SECRET_NAME' },
];

/**
 * Fetches all configured secrets from Secret Manager in parallel and
 * injects them into process.env.
 *
 * Secrets that are already present in process.env are skipped (local dev support).
 * Secrets with no pointer env var configured are also skipped silently.
 */
export const loadAllSecrets = async () => {
  // Only run when on Google Cloud (GOOGLE_CLOUD_PROJECT is always set on GAE)
  const projectId = getProjectId();
  if (!projectId) {
    logger.info('Not running on Google Cloud — skipping Secret Manager bootstrap.');
    return;
  }

  const tasks = SECRET_MAP
    .filter(({ envVar, pointerVar }) => {
      if (process.env[envVar]) return false;       // already set, skip
      if (!process.env[pointerVar]) return false;  // no pointer configured, skip
      return true;
    })
    .map(async ({ envVar, pointerVar, versionVar }) => {
      const secretName = process.env[pointerVar];
      const secretVersion = (versionVar && process.env[versionVar]) || 'latest';
      try {
        const value = await fetchSecret(secretName, secretVersion);
        process.env[envVar] = value;
        logger.info(`Loaded ${envVar} from Secret Manager.`);
      } catch (error) {
        logger.error(`Failed to load ${envVar} from Secret Manager.`, {
          error: error?.message || String(error),
          secretName,
        });
        throw error;
      }
    });

  await Promise.all(tasks);
  logger.info(`Secret Manager bootstrap complete (${tasks.length} secrets loaded).`);
};
