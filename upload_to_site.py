#!/usr/bin/env python3
"""
==============================================================================
 أداة الرفع والمزامنة الآلية لمنصة «رفيق المناظر» (Cloudflare & API Chunked Sync)
==============================================================================
"""

import os
import sys
import time
import uuid
import base64
import zipfile
import argparse
import urllib.request
import urllib.parse
import json

sys.stdout.reconfigure(encoding='utf-8')

DEFAULT_CHUNK_SIZE_MB = 25  # 25MB per chunk (Very safe for Cloudflare 100MB limit)
DEFAULT_TOKEN = 'rafeeq-almunazer-sync-2026-secure'

def format_bytes(size):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"

def make_http_request(url, data=None, headers=None, method='GET', timeout=120):
    if headers is None:
        headers = {}
    
    headers.setdefault('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    body_bytes = None
    if data is not None:
        if isinstance(data, dict):
            body_bytes = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        elif isinstance(data, bytes):
            body_bytes = data
        else:
            body_bytes = str(data).encode('utf-8')

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            resp_body = resp.read().decode('utf-8')
            try:
                return resp.status, json.loads(resp_body)
            except Exception:
                return resp.status, resp_body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='ignore')
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def create_sync_zip(zip_path, media_dir, db_path):
    print("\n📦 [1/4] جاري تجهيز وضغط حزمة الوسائط وقاعدة البيانات...")
    start_time = time.time()
    
    total_files = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as zipf:
        # Add database
        if os.path.exists(db_path):
            print(f"  + إضافة قاعدة البيانات: {os.path.basename(db_path)} ({format_bytes(os.path.getsize(db_path))})")
            zipf.write(db_path, arcname='library.db')
            total_files += 1

        # Add media folder
        if os.path.exists(media_dir):
            print(f"  + إضافة ملفات الوسائط والصور من: {media_dir}")
            for root, dirs, files in os.walk(media_dir):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, os.path.dirname(media_dir))
                    zipf.write(full_p, arcname=rel_p)
                    total_files += 1
                    if total_files % 2500 == 0:
                        print(f"    تم أرشفة {total_files:,} ملف...")

    duration = time.time() - start_time
    zip_size = os.path.getsize(zip_path)
    print(f"✅ تم الانتهاء من الضغط في {duration:.1f} ثانية.")
    print(f"   إجمالي الملفات: {total_files:,} ملف")
    print(f"   حجم الحزمة المضغوطة: {format_bytes(zip_size)}")
    return zip_size

def split_file(file_path, chunk_size_bytes):
    chunks = []
    with open(file_path, 'rb') as f:
        idx = 0
        while True:
            data = f.read(chunk_size_bytes)
            if not data:
                break
            chunks.append(data)
            idx += 1
    return chunks

def print_progress_bar(iteration, total, prefix='', suffix='', decimals=1, length=40, fill='█', speed=''):
    percent = f"{100 * (iteration / float(total)):.{decimals}f}"
    filled_length = int(length * iteration // total)
    bar = fill * filled_length + '-' * (length - filled_length)
    sys.stdout.write(f'\r{prefix} |{bar}| {percent}% {suffix} {speed}')
    sys.stdout.flush()
    if iteration == total:
        sys.stdout.write('\n')

def main():
    parser = argparse.ArgumentParser(description="أداة الرفع والمزامنة الآلية لمنصة «رفيق المناظر»")
    parser.add_argument('--url', help='رابط الموقع (مثال: https://my-site.com)', default=None)
    parser.add_argument('--token', help='رمز المزامنة السري (SYNC_SECRET_TOKEN)', default=DEFAULT_TOKEN)
    parser.add_argument('--chunk-size', type=int, help='حجم الدفعة بالميجابايت', default=DEFAULT_CHUNK_SIZE_MB)
    args = parser.parse_args()

    print("=" * 75)
    print(" 🚀 نظام الرفع والمزامنة الآلية للموقع أون لاين (Cloudflare Safe)")
    print("=" * 75)

    base_url = args.url
    if not base_url:
        print("\nيرجى إدخال رابط موقعك المرفوع أون لاين:")
        base_url = input("🔗 رابط الموقع (مثال https://yourdomain.com): ").strip()

    base_url = base_url.rstrip('/')
    if not base_url.startswith('http://') and not base_url.startswith('https://'):
        base_url = 'https://' + base_url

    token = args.token

    print(f"\n🔍 [2/4] فحص الاتصال بالموقع: {base_url} ...")
    
    # Check /health
    health_status, health_resp = make_http_request(f"{base_url}/health")
    if health_status != 200:
        print(f"❌ تعذر الاتصال بـ {base_url}/health (كود الاستجابة: {health_status})")
        print(f"   الاستجابة: {health_resp}")
        print("تأكد من أن الموقع يعمل أون لاين وأن الرابط صحيح.")
        return

    print("✅ تم تأكيد عمل الموقع بنجاح!")

    # Check /api/sync/status
    sync_status_code, sync_status = make_http_request(
        f"{base_url}/api/sync/status",
        headers={'x-sync-token': token}
    )

    if sync_status_code == 401:
        print("❌ رمز المزامنة (Token) غير صالح.")
        return
    elif sync_status_code != 200:
        print(f"⚠️ نقطة المزامنة /api/sync/status غير متاحة حالياً (كود: {sync_status_code}).")
        print("يرجى التأكد من دفع التحديث الأخير إلى GitHub لينتشر على السيرفر أولاً.")
        return

    print(f"📊 حالة السيرفر الحالية:")
    print(f"   - المنصة: {sync_status.get('platform')}")
    print(f"   - الوثائق الحالية: {sync_status.get('documents_count', 0)}")
    print(f"   - المجلدات الحالية: {sync_status.get('folders_count', 0)}")

    # Paths
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    media_dir = os.path.join(project_root, 'media')
    db_path = os.path.join(project_root, 'server', 'db', 'library.db')
    zip_path = os.path.join(project_root, 'scratch', 'sync_bundle.zip')
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)

    # 1. Create ZIP
    zip_size = create_sync_zip(zip_path, media_dir, db_path)

    # 2. Split into chunks
    chunk_size_bytes = args.chunk_size * 1024 * 1024
    print(f"\n✂️ [3/4] تقسيم الحزمة إلى دفعات ({args.chunk_size} MB لكل دفعة لتجاوز كلاود فلير)...")
    chunks = split_file(zip_path, chunk_size_bytes)
    total_chunks = len(chunks)
    print(f"   إجمالي الدفعات: {total_chunks} دفعة.")

    # 3. Upload chunks
    upload_id = f"sync_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    print(f"\n📡 [4/4] جاري رفع الدفعات إلى السيرفر (Upload Session: {upload_id})...")

    upload_start = time.time()
    uploaded_bytes = 0

    for idx, chunk_bytes in enumerate(chunks):
        chunk_b64 = base64.b64encode(chunk_bytes).decode('ascii')
        payload = {
            'upload_id': upload_id,
            'chunk_index': idx,
            'total_chunks': total_chunks,
            'filename': 'sync_bundle.zip',
            'chunk_data': chunk_b64
        }

        # Upload with retry
        success = False
        attempts = 0
        while not success and attempts < 5:
            attempts += 1
            chunk_start = time.time()
            code, resp = make_http_request(
                f"{base_url}/api/sync/chunk",
                data=payload,
                headers={'x-sync-token': token},
                method='POST',
                timeout=180
            )

            if code == 200 and isinstance(resp, dict) and resp.get('success'):
                success = True
                uploaded_bytes += len(chunk_bytes)
                elapsed = time.time() - upload_start
                speed_mb_s = (uploaded_bytes / (1024 * 1024)) / max(elapsed, 0.1)
                print_progress_bar(
                    idx + 1,
                    total_chunks,
                    prefix=f"الدفعة [{idx+1}/{total_chunks}]",
                    suffix=f"({format_bytes(uploaded_bytes)}/{format_bytes(zip_size)})",
                    speed=f"[{speed_mb_s:.2f} MB/s]"
                )
            else:
                print(f"\n⚠️ تعذر رفع الدفعة {idx+1} (محاولة {attempts}/5): كود {code} - {resp}")
                time.sleep(3)

        if not success:
            print(f"\n❌ فشل رفع الدفعة {idx+1} بعد 5 محاولات. تم إيقاف العملية.")
            return

    # 4. Finalize
    print("\n\n⚙️ جاري إصدار أمر فك الضغط وتحديث قاعدة البيانات على السيرفر...")
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
        print("\n" + "=" * 75)
        print(" 🎉 تم رفع وتثبيت كامل الأرشيف والبيانات على الموقع بنجاح!")
        print("=" * 75)
        print(f" 📂 الملفات المستخرجة: {fin_resp.get('extracted_files', 0):,} ملف")
        print(f" 🗄️ الوثائق في قاعدة البيانات: {fin_resp.get('documents_count', 0):,} وثيقة")
        print(f" 📁 إجمالي المجلدات: {fin_resp.get('folders_count', 0):,} مجلد")
        print(f" 🌐 يمكنك الآن فتح الموقع وتصفح جميع الوثائق والصور:")
        print(f"    {base_url}")
        print("=" * 75)
    else:
        print(f"\n⚠️ خطأ أثناء فك الضغط على السيرفر: كود {fin_code}")
        print(f"   التفاصيل: {fin_resp}")

    # Cleanup local zip
    if os.path.exists(zip_path):
        try:
            os.remove(zip_path)
        except Exception:
            pass

if __name__ == '__main__':
    main()
