import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate roots for media search
export const CANDIDATE_ROOTS = [
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

// In-memory index of filenames -> absolute file paths
let mediaIndex = null;
let lastIndexTime = 0;
const INDEX_TTL_MS = 60 * 1000; // refresh index at most once per minute

/**
 * Recursively scans directory and adds all files to the mediaIndex Map.
 */
function scanDirectory(dir, map) {
  try {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scanDirectory(fullPath, map);
      } else {
        const base = item.name;
        const baseNFC = base.normalize('NFC');
        const cleanBase = base.replace(/[\r\n\t]/g, '').trim();
        
        if (!map.has(base)) map.set(base, fullPath);
        if (!map.has(baseNFC)) map.set(baseNFC, fullPath);
        if (!map.has(cleanBase)) map.set(cleanBase, fullPath);
        if (!map.has(cleanBase.normalize('NFC'))) map.set(cleanBase.normalize('NFC'), fullPath);
      }
    }
  } catch (err) {
    // Ignore permissions / unreadable dirs
  }
}

/**
 * Builds or refreshes the media index across all candidate roots.
 */
export function getMediaIndex() {
  const now = Date.now();
  if (mediaIndex && (now - lastIndexTime < INDEX_TTL_MS)) {
    return mediaIndex;
  }

  const map = new Map();
  for (const root of CANDIDATE_ROOTS) {
    if (fs.existsSync(root)) {
      scanDirectory(root, map);
    }
  }

  mediaIndex = map;
  lastIndexTime = now;
  return mediaIndex;
}

/**
 * Safe existsSync that handles Unicode/emoji normalization issues on Windows.
 */
function safeExists(fullPath) {
  try {
    fs.accessSync(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    try {
      const dir = path.dirname(fullPath);
      const base = path.basename(fullPath);
      if (!fs.existsSync(dir)) return false;
      const files = fs.readdirSync(dir);
      const baseNFC = base.normalize('NFC');
      return files.some(f => f.normalize('NFC') === baseNFC);
    } catch {
      return false;
    }
  }
}

/**
 * Returns the actual resolved path with correct casing if file exists.
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
 * Handles Windows paths on Linux, relative paths, emoji/Unicode normalization, and reorganized directories.
 */
export function resolveImagePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;

  // 1. Normalize input string
  const normalized = inputPath
    .split('\\').join('/')
    .replace(/^['"]|['"]$/g, '')
    .trim();

  // 2. Direct absolute path check
  const direct = safeResolve(normalized);
  if (direct) return direct;

  // 3. Extract relative part (strip media/ or drive letters)
  let subPath = normalized;
  const mediaIdx = normalized.toLowerCase().indexOf('/media/');
  if (mediaIdx !== -1) {
    subPath = normalized.substring(mediaIdx + 7);
  } else if (normalized.toLowerCase().startsWith('media/')) {
    subPath = normalized.substring(6);
  }
  subPath = subPath.replace(/^[a-zA-Z]:\//, '');

  const subParts = subPath.split('/').filter(Boolean);
  if (subParts.length === 0) return null;

  // 4. Try candidate roots with direct subPath
  for (const root of CANDIDATE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const candidate = path.join(root, ...subParts);
    const resolved = safeResolve(candidate);
    if (resolved) return resolved;
  }

  // 5. Try basename lookup in fast media index
  const filename = subParts[subParts.length - 1];
  const index = getMediaIndex();
  
  if (index.has(filename)) return index.get(filename);
  if (index.has(filename.normalize('NFC'))) return index.get(filename.normalize('NFC'));
  
  const cleanFilename = filename.replace(/[\r\n\t]/g, '').trim();
  if (index.has(cleanFilename)) return index.get(cleanFilename);
  if (index.has(cleanFilename.normalize('NFC'))) return index.get(cleanFilename.normalize('NFC'));

  // 6. Try without leading non-alphanumerics if any
  const strippedFilename = cleanFilename.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  if (strippedFilename && index.has(strippedFilename)) {
    return index.get(strippedFilename);
  }

  return null;
}

