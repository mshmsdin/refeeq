# منصة «رفيق المناظر» (The Debater's Companion)

منصة رقمية وأرشيف وثائقي متخصص للمناظرات والبحوث العقدية متعددة المذاهب والفرق، مزودة بمحرك بحث متقدم (FTS5)، استخراج ذكي للنصوص بالـ OCR، خوارزمية ذكية للكلمات الدلالية، وسلة بث حية للبث المباشر (OBS).

---

## 🛠️ مواصفات البيئة ومتطلبات التشغيل

* **Node.js**: `24.19.0 LTS` (`>=24 <25`)
* **Base Docker Image**: `node:24.19.0-bookworm-slim`
* **Internal Port**: `3000` (`HOST=0.0.0.0`)
* **Health Check**: `GET /health` و `GET /ready`
* **Deployment Target**: Ubuntu 24.04 LTS + Coolify + Docker + Traefik / Cloudflare Tunnel

---

## 🚀 أوامر التشغيل والبناء (Scripts)

### 1. التطوير المحلي (Local Development)
```bash
# تشغيل الفرونت إند
cd client
npm install
npm run dev

# تشغيل خادم الـ Backend
cd ../server
npm install
npm start
```

### 2. البناء للإنتاج (Production Build)
```bash
# بناء حزمة الفرونت إند وتجهيز ملفات dist
cd client
npm ci
npm run build

# تشغيل خادم الإنتاج
cd ../server
npm ci --omit=dev
npm start
```

### 3. بناء وتشغيل Docker محلياً (Docker Testing)
```bash
# بناء صورة Docker
docker build -t rafeeq-almunazer .

# تشغيل الحاوية مع تخزين دائم
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name rafeeq-app \
  rafeeq-almunazer

# فحص صحة التطبيق
curl http://localhost:3000/health
```

---

## ⚙️ متغيرات البيئة (Environment Variables)

| المتغير | الوصف | القيمة الافتراضية |
| :--- | :--- | :--- |
| `NODE_ENV` | وضع التشغيل | `production` |
| `PORT` | المنفذ الداخلي للحاوية | `3000` |
| `HOST` | مضيف الاستماع | `0.0.0.0` |
| `DB_PATH` | مسار قاعدة البيانات SQLite | `/app/data/library.db` |
| `ARCHIVE_PATH` | مسار مجلد أرشيف الصور والوثائق | `/app/data/archive` |
| `APP_URL` | الرابط العام للنطاق | `https://yourdomain.com` |

---

## 🐳 إعدادات النشر على Coolify

1. **مصدر النشر**: GitHub Repository (`main` branch).
2. **نوع البناء (Build Pack)**: Dockerfile.
3. **المنفذ الداخلي (Destination Port)**: `3000`.
4. **التخزين الدائم (Persistent Storage)**:
   - اربط مسار الحاوية `/app/data` بمساحة تخزين دائمة على الخادم لتخزين قاعدة البيانات والصور الموثقة.
5. **فحص الصحة (Health Check)**:
   - Path: `/health`
   - Method: `GET`
   - Expected status: `200`
