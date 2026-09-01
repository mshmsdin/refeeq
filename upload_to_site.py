#!/usr/bin/env python3
"""
==============================================================================
 أداة الرفع والمزامنة الآلية لمنصة «رفيق المناظر» (Cloudflare & Binary Stream Sync)
==============================================================================
"""

import os
import sys
import time
import math
import uuid
import zipfile
import gzip
import argparse
import urllib.request
import urllib.parse
import json

sys.stdout.reconfigure(encoding='utf-8')

DEFAULT_CHUNK_SIZE_MB = 10  # 10MB binary per chunk (Super fast & reliable)
DEFAULT_TOKEN = 'rafeeq-almunazer-sync-2026-secure'

CHROME_DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
}

def format_bytes(size):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"

def format_time(seconds):
    if seconds < 60:
        return f"{int(seconds)}s"
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}m {secs}s"

def make_http_request(url, data=None, headers=None, method='GET', timeout=180):
    final_headers = dict(CHROME_DEFAULT_HEADERS)
    if headers:
        final_headers.update(headers)
    
    body_bytes = None
    if data is not None:
        if isinstance(data, dict):
            body_bytes = json.dumps(data).encode('utf-8')
            final_headers.setdefault('Content-Type', 'application/json')
        elif isinstance(data, bytes):
            body_bytes = data
            final_headers.setdefault('Content-Type', 'application/octet-stream')
        else:
            body_bytes = str(data).encode('utf-8')

    req = urllib.request.Request(url, data=body_bytes, headers=final_headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw_bytes = resp.read()
            if resp.headers.get('Content-Encoding') == 'gzip' or raw_bytes.startswith(b'\x1f\x8b'):
                try:
                    raw_bytes = gzip.decompress(raw_bytes)
                except Exception:
                    pass
            resp_body = raw_bytes.decode('utf-8', errors='ignore')
            try:
                return resp.status, json.loads(resp_body)
            except Exception:
                return resp.status, resp_body
    except urllib.error.HTTPError as e:
        raw_err = e.read()
        if e.headers.get('Content-Encoding') == 'gzip' or raw_err.startswith(b'\x1f\x8b'):
            try:
                raw_err = gzip.decompress(raw_err)
            except Exception:
                pass
        err_body = raw_err.decode('utf-8', errors='ignore')
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def create_sync_zip(zip_path, media_dir, storage_dir, db_path, force=False):
    if not force and os.path.exists(zip_path) and os.path.getsize(zip_path) > 1024 * 1024 * 500:
        age_s = time.time() - os.path.getmtime(zip_path)
        if age_s < 7200:
            zip_size = os.path.getsize(zip_path)
            print(f"\n📦 [1/4] تم العثور على الحزمة المضغوطة مسبقاً ({format_bytes(zip_size)})، جاري استخدامها مباشرة...", flush=True)
            return zip_size

    print("\n📦 [1/4] جاري تجهيز وضغط حزمة الوسائط وقاعدة البيانات...", flush=True)
    start_time = time.time()
    
    total_files = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as zipf:
        if os.path.exists(db_path):
            print(f"  + إضافة قاعدة البيانات: {os.path.basename(db_path)} ({format_bytes(os.path.getsize(db_path))})", flush=True)
            zipf.write(db_path, arcname='library.db')
            total_files += 1

        if os.path.exists(media_dir):
            print(f"  + إضافة ملفات الوسائط والصور من: {media_dir}", flush=True)
            for root, dirs, files in os.walk(media_dir):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, os.path.dirname(media_dir))
                    zipf.write(full_p, arcname=rel_p)
                    total_files += 1
                    if total_files % 2500 == 0:
                        print(f"    تم أرشفة {total_files:,} ملف...", flush=True)

        if storage_dir and os.path.exists(storage_dir):
            print(f"  + إضافة ملفات التخزين والكتب من: {storage_dir}", flush=True)
            for root, dirs, files in os.walk(storage_dir):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = 'storage/' + os.path.relpath(full_p, storage_dir).replace('\\', '/')
                    zipf.write(full_p, arcname=rel_p)
                    total_files += 1

    duration = time.time() - start_time
    zip_size = os.path.getsize(zip_path)
    print(f"✅ تم الانتهاء من الضغط في {duration:.1f} ثانية.", flush=True)
    print(f"   إجمالي الملفات: {total_files:,} ملف", flush=True)
    print(f"   حجم الحزمة المضغوطة: {format_bytes(zip_size)}", flush=True)
    return zip_size

def main():
    parser = argparse.ArgumentParser(description="أداة الرفع والمزامنة الآلية لمنصة «رفيق المناظر»")
    parser.add_argument('--url', help='رابط الموقع (مثال: https://my-site.com)', default=None)
    parser.add_argument('--token', help='رمز المزامنة السري (SYNC_SECRET_TOKEN)', default=DEFAULT_TOKEN)
    parser.add_argument('--chunk-size', type=int, help='حجم الدفعة بالميجابايت', default=DEFAULT_CHUNK_SIZE_MB)
    parser.add_argument('--force', action='store_true', help='إعادة ضغط الحزمة من الصفر وتجاهل الحزمة المؤقتة السابقة')
    args = parser.parse_args()

    print("=" * 75, flush=True)
    print(" 🚀 نظام الرفع والمزامنة الآلية للموقع أون لاين (Cloudflare Stream)", flush=True)
    print("=" * 75, flush=True)

    base_url = args.url
    if not base_url:
        print("\nيرجى إدخال رابط موقعك المرفوع أون لاين:", flush=True)
        base_url = input("🔗 رابط الموقع (مثال https://yourdomain.com): ").strip()

    base_url = base_url.rstrip('/')
    if not base_url.startswith('http://') and not base_url.startswith('https://'):
        base_url = 'https://' + base_url

    token = args.token

    print(f"\n🔍 [2/4] فحص الاتصال بالموقع: {base_url} ...", flush=True)
    
    sync_status_code, sync_status = make_http_request(
        f"{base_url}/api/sync/status",
        headers={'x-sync-token': token}
    )

    if sync_status_code != 200 and base_url.endswith('/rafeeq'):
        alt_base = base_url[:-7]
        alt_code, alt_status = make_http_request(
            f"{alt_base}/api/sync/status",
            headers={'x-sync-token': token}
        )
        if alt_code == 200:
            base_url = alt_base
            sync_status_code = alt_code
            sync_status = alt_status

    if sync_status_code == 401:
        print("❌ رمز المزامنة (Token) غير صالح.", flush=True)
        return
    elif sync_status_code != 200:
        print(f"⚠️ نقطة المزامنة /api/sync/status غير متاحة حالياً (كود: {sync_status_code}). قد يكون السيرفر يعيد التشغيل.", flush=True)
        return

    print("✅ تم تأكيد الاتصال بالسيرفر بنجاح!", flush=True)

    print(f"📊 حالة السيرفر الحالية:", flush=True)
    print(f"   - المنصة: {sync_status.get('platform')}", flush=True)
    print(f"   - الوثائق الحالية: {sync_status.get('documents_count', 0)}", flush=True)
    print(f"   - المجلدات الحالية: {sync_status.get('folders_count', 0)}", flush=True)

    project_root = os.path.dirname(os.path.abspath(__file__))
    media_dir = os.path.join(project_root, 'media')
    storage_dir = os.path.join(project_root, 'server', 'storage')
    db_path = os.path.join(project_root, 'server', 'db', 'library.db')
    zip_path = os.path.join(project_root, 'scratch', 'sync_bundle.zip')
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)

    # 1. Create or reuse ZIP
    zip_size = create_sync_zip(zip_path, media_dir, storage_dir, db_path, force=args.force)

    # 2. Setup streaming chunks
    chunk_size_bytes = args.chunk_size * 1024 * 1024
    total_chunks = math.ceil(zip_size / chunk_size_bytes)
    print(f"\n✂️ [3/4] تقسيم الحزمة ({format_bytes(zip_size)}) إلى {total_chunks} دفعة بث ({args.chunk_size} MB لكل دفعة)...", flush=True)

    # 3. Upload stream
    upload_id = f"sync_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    print(f"\n📡 [4/4] بدء رفع الدفعات إلى السيرفر (Upload Session: {upload_id})...\n", flush=True)

    upload_start = time.time()
    uploaded_bytes = 0

    with open(zip_path, 'rb') as f:
        for idx in range(total_chunks):
            chunk_bytes = f.read(chunk_size_bytes)
            if not chunk_bytes:
                break
            
            chunk_url = f"{base_url}/api/sync/chunk-stream?upload_id={upload_id}&chunk_index={idx}&total_chunks={total_chunks}&filename=sync_bundle.zip"

            success = False
            attempts = 0
            while not success and attempts < 5:
                attempts += 1
                t_chunk_start = time.time()
                code, resp = make_http_request(
                    chunk_url,
                    data=chunk_bytes,
                    headers={
                        'Content-Type': 'application/octet-stream',
                        'x-sync-token': token
                    },
                    method='POST',
                    timeout=180
                )

                if code == 200 and isinstance(resp, dict) and resp.get('success'):
                    success = True
                    uploaded_bytes += len(chunk_bytes)
                    elapsed = time.time() - upload_start
                    speed_mb_s = (uploaded_bytes / (1024 * 1024)) / max(elapsed, 0.1)
                    remaining_bytes = zip_size - uploaded_bytes
                    eta_s = remaining_bytes / max(speed_mb_s * 1024 * 1024, 1)
                    percent = (uploaded_bytes / zip_size) * 100
                    
                    print(
                        f"  ▶ [الدفعة {idx+1:03d}/{total_chunks:03d}] {percent:5.1f}% | "
                        f"{format_bytes(uploaded_bytes)} / {format_bytes(zip_size)} | "
                        f"السرعة: {speed_mb_s:.2f} MB/s | متبقي: {format_time(eta_s)}",
                        flush=True
                    )
                else:
                    print(f"  ⚠️ خطأ في رفع الدفعة {idx+1} (محاولة {attempts}/5): كود {code} - {resp}", flush=True)
                    time.sleep(3)

            if not success:
                print(f"\n❌ فشل رفع الدفعة {idx+1} بعد 5 محاولات. تم إيقاف العملية.", flush=True)
                return

    # 4. Finalize
    total_elapsed = time.time() - upload_start
    print(f"\n✅ اكتمل رفع كافة الدفعات الـ {total_chunks} في {format_time(total_elapsed)}!", flush=True)
    print("⚙️ جاري إصدار أمر فك الضغط وتحديث قاعدة البيانات على السيرفر (قد يستغرق 30-60 ثانية)...", flush=True)
    
    fin_code, fin_resp = make_http_request(
        f"{base_url}/api/sync/finalize",
        data={
            'upload_id': upload_id,
            'filename': 'sync_bundle.zip',
            'total_chunks': total_chunks
        },
        headers={'x-sync-token': token},
        method='POST',
        timeout=300
    )

    if fin_code == 200 and isinstance(fin_resp, dict) and fin_resp.get('success'):
        print("\n" + "=" * 75, flush=True)
        print(" 🎉 تم رفع وتثبيت كامل الأرشيف والبيانات على الموقع بنجاح!", flush=True)
        print("=" * 75, flush=True)
        print(f" 📂 الملفات المستخرجة: {fin_resp.get('extracted_files', 0):,} ملف", flush=True)
        print(f" 🗄️ الوثائق في قاعدة البيانات: {fin_resp.get('documents_count', 0):,} وثيقة", flush=True)
        print(f" 📁 إجمالي المجلدات: {fin_resp.get('folders_count', 0):,} مجلد", flush=True)
        print(f" 🌐 يمكنك الآن فتح الموقع وتصفح جميع الوثائق والصور:", flush=True)
        print(f"    {base_url}", flush=True)
        print("=" * 75, flush=True)
    else:
        print(f"\n⚠️ خطأ أثناء فك الضغط على السيرفر: كود {fin_code}", flush=True)
        print(f"   التفاصيل: {fin_resp}", flush=True)

if __name__ == '__main__':
    main()
