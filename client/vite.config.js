import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function normalizeBasePath(value) {
  const raw = String(value || '/rafeeq').trim();
  if (!raw || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const bibleOnly = env.VITE_BIBLE_ONLY === 'true';
  const base = normalizeBasePath(env.VITE_BASE_PATH || (bibleOnly ? '/bible' : '/rafeeq'));
  const basePrefix = base === '/' ? '' : base.slice(0, -1);
  const site = bibleOnly
    ? {
        title: 'الكتاب المقدس | Bible',
        description: 'الكتاب المقدس باللغة العربية: تصفح الأسفار والأصحاحات والأعداد، وابحث وقارن الترجمات مع توثيق المرجع.',
        canonical: env.VITE_SITE_URL || 'https://wiki.din.hk/bible/'
      }
    : {
        title: 'رفيق المناظر | منصة توثيق وأرشيف المناظرات',
        description: 'منصة عربية للبحث في أرشيف المناظرات والوثائق، مع قسم مستقل للكتاب المقدس.',
        canonical: env.VITE_SITE_URL || 'https://din.hk/rafeeq/'
      };

  const metadataPlugin = {
    name: 'rafeeq-metadata',
    transformIndexHtml(html) {
      return html
        .replaceAll('__SITE_TITLE__', site.title)
        .replaceAll('__SITE_DESCRIPTION__', site.description)
        .replaceAll('__CANONICAL_URL__', site.canonical);
    },
    closeBundle() {
      if (!bibleOnly) return;
      const dist = path.resolve(process.cwd(), 'dist');
      const seoDir = path.resolve(process.cwd(), 'seo');
      for (const [source, target] of [
        ['llms-bible.txt', 'llms.txt'],
        ['sitemap-bible.xml', 'sitemap.xml'],
        ['robots-bible.txt', 'robots.txt']
      ]) {
        fs.copyFileSync(path.join(seoDir, source), path.join(dist, target));
      }
    }
  };

  return {
    base,
    plugins: [react(), metadataPlugin],
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        [`${basePrefix}/api`]: {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(new RegExp(`^${basePrefix}`), '')
        },
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        },
        [`${basePrefix}/media`]: {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(new RegExp(`^${basePrefix}`), '')
        },
        '/media': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        }
      }
    }
  };
});

