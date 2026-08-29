#!/usr/bin/env python3
"""
==============================================================================
 أداة المزامنة الفائقة عبر نفق كلاود فلير الآمن (Cloudflare Tunnel Direct Sync)
==============================================================================
"""

import os
import sys
import time
import re
import subprocess
import threading
import http.server
import socketserver
import urllib.request
import json
import gzip

sys.stdout.reconfigure(encoding='utf-8')

DEFAULT_TOKEN = 'rafeeq-almunazer-sync-2026-secure'
PORT = 8989

CHROME_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
    'x-sync-token': DEFAULT_TOKEN
}

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        scratch_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scratch')
        super().__init__(*args, directory=scratch_dir, **kwargs)

    def log_message(self, format, *args):
        print(f"  [نقل البيانات] {self.address_string()} - {format % args}", flush=True)

def start_local_server():
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer(("127.0.0.1", PORT), CustomHTTPHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server


def main():
    print("=" * 75, flush=True)
    print(" 🚀 نظام المزامنة والرفع الفائق عبر نفق كلاود فلير الآمن", flush=True)
    print("=" * 75, flush=True)

    project_root = os.path.dirname(os.path.abspath(__file__))
    zip_path = os.path.join(project_root, 'scratch', 'sync_bundle.zip')
    cf_exe = os.path.join(project_root, 'scratch', 'cloudflared.exe')
    base_url = 'https://din.hk/rafeeq'

    if not os.path.exists(zip_path):
        print("❌ لم يتم العثور على الحزمة المضغوطة scratch/sync_bundle.zip")
        return

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"\n📦 [1/4] تم تجهيز حزمة الوسائط وقاعدة البيانات بنجاح ({zip_size_mb:.2f} MB)", flush=True)

    # 1. Start Local HTTP Server
    print(f"\n🖥️ [2/4] بدء خادم النقل المحلي على المنفذ {PORT}...", flush=True)
    server = start_local_server()
    print("✅ خادم النقل المحلي يعمل بنجاح.", flush=True)

    # 2. Start Cloudflare Tunnel
    print("\n🌐 [3/4] فتح نفق كلاود فلير الآمن (Cloudflare Tunnel)...", flush=True)
    cf_proc = subprocess.Popen(
        [cf_exe, 'tunnel', '--url', f'http://127.0.0.1:{PORT}'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    tunnel_url = None
    t0 = time.time()
    while time.time() - t0 < 25:
        line = cf_proc.stderr.readline()
        if not line:
            continue
        match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
        if match:
            tunnel_url = match.group(0)
            break

    if not tunnel_url:
        print("❌ فشل فتح نفق كلاود فلير. يرجى التحقق من اتصال الإنترنت.")
        cf_proc.terminate()
        return

    print(f"✅ تم فتح النفق العالمي بنجاح: {tunnel_url}", flush=True)
    direct_download_url = f"{tunnel_url}/sync_bundle.zip"
    print(f"🔗 رابط التحميل المباشر للسيرفر: {direct_download_url}", flush=True)

    # Warm up tunnel
    print("⏳ جاري التحقق من جاهزية النفق عالمياً (انتظار 5 ثوانٍ)...", flush=True)
    time.sleep(5)
    for attempt in range(1, 4):
        try:
            test_req = urllib.request.Request(direct_download_url, headers={'Range': 'bytes=0-100'})
            with urllib.request.urlopen(test_req, timeout=10) as r:
                if r.status in (200, 206):
                    print("✅ النفق متصل ويعمل عالمياً بأقصى سرعة!", flush=True)
                    break
        except Exception as e:
            print(f"  محاولة فحص {attempt}/3: في انتظار انتشار النفق...")
            time.sleep(3)

    # 3. Trigger Server Pull
    print(f"\n⚡ [4/4] إرسال أمر السحب والتثبيت إلى سيرفر الموقع الحي ({base_url})...", flush=True)
    print("⏳ السيرفر يقوم الآن بسحب الحزمة بسرعة فائقة وفك ضغط كافة الوثائق والصور...", flush=True)


    pull_payload = {
        'url': direct_download_url
    }

    req = urllib.request.Request(
        f"{base_url}/api/sync/pull-url",
        data=json.dumps(pull_payload).encode('utf-8'),
        headers=CHROME_HEADERS,
        method='POST'
    )

    try:
        t_pull_start = time.time()
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            if resp.headers.get('Content-Encoding') == 'gzip' or raw.startswith(b'\x1f\x8b'):
                try:
                    raw = gzip.decompress(raw)
                except:
                    pass
            initial_res = json.loads(raw.decode('utf-8'))

        if not initial_res.get('success'):
            print(f"❌ فشل بدء السحب من السيرفر: {initial_res}")
            return

        print(f"✅ استلم السيرفر الأمر وبدأ السحب في الخلفية.", flush=True)
        print("⏳ جاري متابعة تقدم التحميل والفك على السيرفر لحظياً...\n", flush=True)

        # Polling loop
        status_req = urllib.request.Request(
            f"{base_url}/api/sync/status",
            headers=CHROME_HEADERS,
            method='GET'
        )

        last_progress = ""
        while True:
            time.sleep(3)
            try:
                with urllib.request.urlopen(status_req, timeout=20) as s_resp:
                    raw_s = s_resp.read()
                    if s_resp.headers.get('Content-Encoding') == 'gzip' or raw_s.startswith(b'\x1f\x8b'):
                        try:
                            raw_s = gzip.decompress(raw_s)
                        except:
                            pass
                    s_data = json.loads(raw_s.decode('utf-8'))

                status = s_data.get('job_status') or s_data.get('status')
                progress = s_data.get('job_progress') or s_data.get('progress', '')
                
                if progress != last_progress and progress:
                    print(f"  ⚡ [{str(status).upper()}] {progress}", flush=True)
                    last_progress = progress

                if status == 'completed':
                    stats = s_data.get('job_stats') or s_data.get('stats', {})
                    elapsed = time.time() - t_pull_start

                    print("\n" + "=" * 75, flush=True)
                    print(f" 🎉 تم رفع وتثبيت كامل الأرشيف والبيانات بنجاح في {elapsed:.1f} ثانية!", flush=True)
                    print("=" * 75, flush=True)
                    print(f" 📂 إجمالي الملفات المستخرجة: {stats.get('extracted_files', 0):,} ملف", flush=True)
                    print(f" 🗄️ الوثائق في قاعدة البيانات: {stats.get('documents_count', 0):,} وثيقة", flush=True)
                    print(f" 📁 إجمالي المجلدات: {stats.get('folders_count', 0):,} مجلد", flush=True)
                    print(f" 🌐 يمكنك الآن فتح وتصفح جميع الوثائق والصور أون لاين:", flush=True)
                    print(f"    {base_url}", flush=True)
                    print("=" * 75, flush=True)
                    break
                elif status == 'error':
                    print(f"\n❌ خطأ في معالجة السيرفر: {s_data.get('error')}", flush=True)
                    break

            except Exception as poll_err:
                print(f"  ⏳ في انتظار تحديث حالة السيرفر... ({poll_err})")

    except urllib.error.HTTPError as e:
        raw_err = e.read()
        if e.headers.get('Content-Encoding') == 'gzip' or raw_err.startswith(b'\x1f\x8b'):
            try:
                raw_err = gzip.decompress(raw_err)
            except:
                pass
        print(f"❌ خطأ من السيرفر: كود {e.code} - {raw_err.decode('utf-8', errors='ignore')}", flush=True)
    except Exception as e:
        print(f"❌ خطأ أثناء الاتصال: {e}", flush=True)

    finally:
        cf_proc.terminate()
        server.shutdown()
        print("\n🔒 تم إغلاق النفق والخادم المحلي بأمان.", flush=True)

if __name__ == '__main__':
    main()
