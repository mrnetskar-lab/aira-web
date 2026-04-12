import path from 'path';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const MAX_FILENAME_LENGTH = 255;

export function resolveSafeImagePath(imagesDir, rawFilename) {
  if (typeof rawFilename !== 'string' || rawFilename.length === 0) {
    return null;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawFilename);
  } catch {
    return null;
  }

  // Route params should never include path separators; basename check blocks traversal attempts.
  if (decoded !== path.basename(decoded)) {
    return null;
  }

  if (decoded.length > MAX_FILENAME_LENGTH) {
    return null;
  }

  // Reject control characters/newlines while allowing common filename punctuation.
  if (/[^\x20-\x7E]/.test(decoded) || /[\r\n]/.test(decoded)) {
    return null;
  }

  const ext = path.extname(decoded).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return null;
  }

  const absoluteImagePath = path.resolve(imagesDir, decoded);
  const rootWithSep = imagesDir.endsWith(path.sep) ? imagesDir : `${imagesDir}${path.sep}`;

  if (!absoluteImagePath.startsWith(rootWithSep)) {
    return null;
  }

  return absoluteImagePath;
}
