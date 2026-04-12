import path from 'path';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const SAFE_FILENAME_RE = /^[A-Za-z0-9._ -]+$/;

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

  if (!SAFE_FILENAME_RE.test(decoded)) {
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
