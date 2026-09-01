import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported media extensions
const MEDIA_EXT_REGEX = /\.(jpe?g|png|webp|gif|bmp|svg|pdf|ogg|mp3|mp4|wav)$/i;

// Clean emoji and decorative symbols from filenames for robust matching
export function stripSymbols(str) {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '') // emojis & symbols
    .replace(/^[^\p{L}\p{N}]+/u, '') // leading non-alphanumeric
    .replace(/[\r\n\t]/g, '')
    .trim();
}

// Candidate roots for media search
export const CANDIDATE_ROOTS = [
  process.env.MEDIA_PATH,
  process.env.ARCHIVE_PATH,
  path.resolve(__dirname, '../../media'),                 // e:\المكتبة الشيعية\تطبيق\media
  path.resolve(__dirname, '../storage'),                  // server/storage
  path.resolve(__dirname, '../storage/atheism/basaar/media'),
  path.resolve(__dirname, '../storage/atheism/shubuhat_almulhidin/media'),
  path.resolve(__dirname, '../storage/atheism/atheism_and_islam/media'),
  '/app/data/media',
  '/app/data/archive',
  '/app/data/storage',
  path.resolve(__dirname, '../media'),
  path.resolve(__dirname, '../data/media'),
  path.resolve(__dirname, '../data/archive'),
  path.resolve(process.cwd(), 'media'),
  path.resolve(process.cwd(), 'server/storage'),
  path.resolve(process.cwd(), 'data/media'),
  'E:\\المكتبة الشيعية\\تطبيق\\media',
  'E:\\المكتبة الشيعية\\الرافضة'
].filter(Boolean);

// In-memory index of filenames/relative paths -> absolute file paths
let mediaIndex = null;
let lastIndexTime = 0;
let isIndexing = false;
const INDEX_TTL_MS = 5 * 60 * 1000; // refresh index at most once every 5 minutes

/**
 * Recursively scans directory and adds all files to the mediaIndex Map.
 */
function scanDirectory(dir, map, baseRoot = '') {
  try {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        // Skip temporary sync or node_modules dirs
        if (item.name === 'tmp_sync' || item.name === 'node_modules' || item.name === '.git') {
          continue;
        }
        scanDirectory(fullPath, map, baseRoot || dir);
      } else {
        const base = item.name;
        if (!MEDIA_EXT_REGEX.test(base)) continue;

        const baseNFC = base.normalize('NFC');
        const cleanBase = stripSymbols(base);
        const cleanBaseNFC = cleanBase.normalize('NFC');

        // Store under various keys
        if (!map.has(base)) map.set(base, fullPath);
        if (!map.has(baseNFC)) map.set(baseNFC, fullPath);
        if (cleanBase && !map.has(cleanBase)) map.set(cleanBase, fullPath);
        if (cleanBaseNFC && !map.has(cleanBaseNFC)) map.set(cleanBaseNFC, fullPath);

        // Also index relative path from root
        if (baseRoot) {
          const rel = path.relative(baseRoot, fullPath).split('\\').join('/');
          const relNFC = rel.normalize('NFC');
          const cleanRel = stripSymbols(rel);

          if (!map.has(rel)) map.set(rel, fullPath);
          if (!map.has(relNFC)) map.set(relNFC, fullPath);
          if (cleanRel && !map.has(cleanRel)) map.set(cleanRel, fullPath);

          // Strip top folder (e.g. media/ or christian/)
          const relWithoutTop = rel.replace(/^[^/]+\//, '');
          if (relWithoutTop && !map.has(relWithoutTop)) map.set(relWithoutTop, fullPath);
        }
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

  if (isIndexing && mediaIndex) {
    return mediaIndex;
  }

  isIndexing = true;
  try {
    const map = new Map();
    const seenRoots = new Set();

    for (const root of CANDIDATE_ROOTS) {
      const resolvedRoot = path.resolve(root);
      if (seenRoots.has(resolvedRoot) || !fs.existsSync(resolvedRoot)) continue;
      seenRoots.add(resolvedRoot);

      scanDirectory(resolvedRoot, map, resolvedRoot);
    }

    mediaIndex = map;
    lastIndexTime = now;
  } catch (e) {
    console.error('[PathResolver] Indexing error:', e);
  } finally {
    isIndexing = false;
  }

  return mediaIndex || new Map();
}

/**
 * Fast exists check on absolute path.
 */
function safeExists(fullPath) {
  try {
    fs.accessSync(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
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

  if (!normalized) return null;

  // 2. Check if this even has an image extension
  if (!MEDIA_EXT_REGEX.test(normalized)) {
    return null;
  }

  // 3. Direct absolute path check
  if (path.isAbsolute(normalized) && safeExists(normalized)) {
    return path.resolve(normalized);
  }

  // 4. Extract relative part (strip media/ or drive letters)
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

  // 5. Try candidate roots with direct subPath
  for (const root of CANDIDATE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const candidate = path.join(root, ...subParts);
    if (safeExists(candidate)) {
      return path.resolve(candidate);
    }
  }

  // 6. Fast Map Lookup in In-Memory Media Index (O(1))
  const filename = subParts[subParts.length - 1];
  const index = getMediaIndex();

  if (index.has(subPath)) return index.get(subPath);
  if (index.has(subPath.normalize('NFC'))) return index.get(subPath.normalize('NFC'));

  if (index.has(filename)) return index.get(filename);
  if (index.has(filename.normalize('NFC'))) return index.get(filename.normalize('NFC'));

  const cleanFilename = stripSymbols(filename);
  if (cleanFilename) {
    if (index.has(cleanFilename)) return index.get(cleanFilename);
    if (index.has(cleanFilename.normalize('NFC'))) return index.get(cleanFilename.normalize('NFC'));
  }

  const cleanSubPath = stripSymbols(subPath);
  if (cleanSubPath) {
    if (index.has(cleanSubPath)) return index.get(cleanSubPath);
    if (index.has(cleanSubPath.normalize('NFC'))) return index.get(cleanSubPath.normalize('NFC'));
  }

  return null;
}

// Pre-warm index at module load
setTimeout(() => {
  try {
    getMediaIndex();
  } catch (e) {}
}, 100);
