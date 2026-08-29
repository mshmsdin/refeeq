import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate roots for media search
const CANDIDATE_ROOTS = [
  process.env.MEDIA_PATH,
  process.env.ARCHIVE_PATH,
  path.resolve(__dirname, '../../media'),   // e:\المكتبة الشيعية\تطبيق\media
  path.resolve(__dirname, '../storage'),    // server/storage
  '/app/data/media',
  '/app/data/archive',
  '/app/data',
  path.resolve(__dirname, '../media'),
  path.resolve(__dirname, '../data/media'),
  path.resolve(__dirname, '../data/archive'),
  path.resolve(process.cwd(), 'media'),
  path.resolve(process.cwd(), 'data/media'),
  path.resolve(process.cwd(), 'data/archive'),
  'E:\\المكتبة الشيعية\\تطبيق\\media',
  'E:\\المكتبة الشيعية\\الرافضة'
].filter(Boolean);

/**
 * Safe existsSync that handles Unicode/emoji normalization issues on Windows.
 * Falls back to directory listing when direct stat fails.
 */
function safeExists(fullPath) {
  try {
    fs.accessSync(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    // Fallback: check via parent directory listing
    // This handles emoji/Unicode normalization differences on Windows NTFS
    try {
      const dir = path.dirname(fullPath);
      const base = path.basename(fullPath);
      if (!fs.existsSync(dir)) return false;
      const files = fs.readdirSync(dir);
      // Compare by NFC normalization
      const baseNFC = base.normalize('NFC');
      return files.some(f => f.normalize('NFC') === baseNFC);
    } catch {
      return false;
    }
  }
}

/**
 * Like safeExists but returns the actual resolved path with correct casing.
 */
function safeResolve(fullPath) {
  try {
    fs.accessSync(fullPath, fs.constants.F_OK);
    return path.resolve(fullPath);
  } catch {
    try {
      const dir = path.dirname(fullPath);
      const base = path.basename(fullPath);
      if (!fs.existsSync(dir)) return null;
      const files = fs.readdirSync(dir);
      const baseNFC = base.normalize('NFC');
      const match = files.find(f => f.normalize('NFC') === baseNFC);
      if (match) return path.resolve(path.join(dir, match));
    } catch {
      return null;
    }
    return null;
  }
}

/**
 * Intelligent cross-platform image path resolver.
 * Handles Windows paths on Linux, relative paths, emoji in filenames, and archive relocations.
 */
export function resolveImagePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;

  // 1. Direct path check
  const direct = safeResolve(inputPath);
  if (direct) return direct;

  // 2. Normalize path: convert backslashes to forward slashes, strip quotes
  // Use split/join to reliably handle single backslashes
  const normalized = inputPath
    .split('\\').join('/')
    .replace(/^['"]|['"]$/g, '')
    .trim();

  // 3. Extract relative part (e.g. after 'media/' or relative sect directory)
  let subPath = normalized;
  const mediaIdx = normalized.toLowerCase().indexOf('/media/');
  if (mediaIdx !== -1) {
    subPath = normalized.substring(mediaIdx + 7);
  } else if (normalized.toLowerCase().startsWith('media/')) {
    subPath = normalized.substring(6);
  }

  // Strip drive letters like E:/ or C:/ if still present
  subPath = subPath.replace(/^[a-zA-Z]:\//, '');

  // 4. Try candidate roots with subPath parts
  const subParts = subPath.split('/').filter(Boolean);

  for (const root of CANDIDATE_ROOTS) {
    const candidate = path.join(root, ...subParts);
    const resolved = safeResolve(candidate);
    if (resolved) return resolved;

    // Also try filename only in root
    const candidateDirect = path.join(root, subParts[subParts.length - 1]);
    const resolvedDirect = safeResolve(candidateDirect);
    if (resolvedDirect) return resolvedDirect;
  }

  // 5. Try filename only inside known sect subfolders
  const filename = subParts[subParts.length - 1];
  const sects = ['شيعة', 'نصارى', 'christian', 'إلحاد', 'سلفية'];
  for (const root of CANDIDATE_ROOTS) {
    for (const sect of sects) {
      const sectCandidate = path.join(root, sect, filename);
      const resolved = safeResolve(sectCandidate);
      if (resolved) return resolved;
    }
  }

  return null;
}
