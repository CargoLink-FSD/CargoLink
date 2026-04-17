import path from 'path';

const randomPart = () => `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

export const createNoopTestStorage = (prefix = 'test-upload') => ({
  _handleFile(req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.bin';
    const filename = `${prefix}-${file.fieldname}-${randomPart()}${ext}`;

    file.filename = filename;
    file.path = filename;

    const chunks = [];
    file.stream.on('data', (chunk) => chunks.push(chunk));
    file.stream.on('error', (err) => cb(err));
    file.stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      cb(null, {
        filename,
        path: filename,
        size: buffer.length,
        buffer,
      });
    });
  },
  _removeFile(_req, _file, cb) {
    cb(null);
  },
});
