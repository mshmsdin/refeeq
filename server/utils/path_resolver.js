import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate roots for media search
const CANDIDATE_ROOTS = [
  process.env.MEDIA_PATH,
  process.env.ARCHIVE_PATH,
  path.resolve(__dirname, '../../media'),   // e:\المكتبة الشيعية\تطبيق\media ← الأصح
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
 * Intelligent cross-platform image path resolver.
 * Handles Windows paths on Linux, relative paths, and archive relocations.
 */
export function resolveImagePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;

  // 1. Direct path check
  if (fs.existsSync(inputPath)) {
    return path.resolve(inputPath);
  }

  // 2. Normalize path (strip quotes, normalize slashes)
  const normalized = inputPath.replace(/\\/g, '/').replace(/^['"]|['"]$/g, '').trim();

  // 3. Extract relative part (e.g. after 'media/' or relative sect directory)
  let subPath = normalized;
  const mediaIdx = normalized.toLowerCase().indexOf('/media/');
  if (mediaIdx !== -1) {
    subPath = normalized.substring(mediaIdx + 7);
  } else if (normalized.toLowerCase().startsWith('media/')) {
    subPath = normalized.substring(6);
  }

  // Also strip drive letters like E:/ or C:/ if still present
  subPath = subPath.replace(/^[a-zA-Z]:\//, '');

  // 4. Try candidate roots with subPath
  for (const root of CANDIDATE_ROOTS) {
    const candidate = path.join(root, subPath);
    if (fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
    // Also try candidate directly if subPath had sect name
    const candidateDirect = path.join(root, path.basename(normalized));
    if (fs.existsSync(candidateDirect)) {
      return path.resolve(candidateDirect);
    }
  }

  // 5. Try resolving from filename only inside known sect folders
  const filename = path.basename(normalized);
  const sects = ['شيعة', 'نصارى', 'christian', 'إلحاد', 'سلفية'];
  for (const root of CANDIDATE_ROOTS) {
    for (const sect of sects) {
      const sectCandidate = path.join(root, sect, filename);
      if (fs.existsSync(sectCandidate)) {
        return path.resolve(sectCandidate);
      }
    }
  }

  return null;
}
