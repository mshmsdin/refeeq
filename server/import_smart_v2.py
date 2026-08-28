"""
محرك الفهرسة الذكية لتصديرات تيليغرام
=====================================
القواعد:
1. نص الصورة = الكابشن المرفق بها في نفس المنشور
2. إذا كانت صور متعددة في نفس الوقت (ألبوم) -> تُدمج جميعها تحت عنوان واحد من أول نص وُجد فيها
3. إذا لا يوجد نص: ابحث في الردود أو في نافذة ±5 دقائق
4. صنّف المنشور في المجلد المناسب منطقياً
"""
import sys, os, re, sqlite3, shutil
from pathlib import Path
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

# ============================
# إعدادات
# ============================
EXPORTS = [
    r"C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22 (2)",
    r"C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22 (1)",
    r"C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22",
]

MEDIA_DEST = r"e:\المكتبة الشيعية\تطبيق\media\christian\images"
DB_PATH    = r"e:\المكتبة الشيعية\تطبيق\server\db\library.db"
SECT       = "نصارى"

# الأقسام العشرة مع كلماتهم الدلالية للتصنيف التلقائي
CATEGORIES = {
    "تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل": [
        "تحريف", "نقد نصي", "مخطوط", "بابيرس", "ترجمة", "تناقض", "إنجيل", "إنجيل يوحنا",
        "إنجيل مرقس", "متى", "لوقا", "أناجيل", "نسخة", "طبعة", "نقد", "توراة", "خطأ"
    ],
    "ألوهية المسيح وعقيدة الثالوث ونقد التجسد": [
        "ألوهية", "الثالوث", "تجسد", "ابن الله", "المسيح إله", "المسيح ليس إله",
        "لاهوت", "ناسوت", "طبيعتان", "أقنوم", "عيسى", "يسوع", "المسيح", "الله الابن",
        "إله", "بابا شنوده", "كلمة الله"
    ],
    "قضية الصلب والفداء والقيامة والصلب المزعوم": [
        "صلب", "فداء", "قيامة", "خلاص", "موت المسيح", "صليب", "الفادي", "كفارة",
        "دم", "ذبيحة", "قبر", "القيامة"
    ],
    "المرأة والأسرة والزواج والطلاق في المسيحية": [
        "المرأة", "زواج", "طلاق", "عائلة", "أسرة", "نساء", "الأنثى",
        "الرجل والمرأة", "بولس والمرأة"
    ],
    "الأخلاق والتشريعات والعنف والحروب في الكتاب المقدس": [
        "أخلاق", "عنف", "حرب", "قتل", "ذبح", "جزية", "سبي", "غنيمة",
        "الله يأمر بالقتل", "إبادة", "تشريع"
    ],
    "دراسات وبشارات العهد القديم ونبوءات النبي محمد ﷺ": [
        "عهد قديم", "العهد القديم", "بشارة", "نبوءة", "نبوة", "محمد في الكتاب",
        "اشعياء", "تثنية", "مزمور", "أنبياء", "التوراة", "سفر", "موسى"
    ],
    "دراسات العهد الجديد ورسائل بولس ونقد تلاميذه": [
        "عهد جديد", "رسالة بولس", "بولس", "تلاميذ", "الرسل", "أعمال الرسل",
        "رسالة", "كورنثوس", "غلاطية", "رومية", "عبرانيين"
    ],
    "تاريخ الكنيسة والمجامع والرهبنة والباباوات والطقوس": [
        "مجمع", "كنيسة", "بابا", "رهبان", "مجمع نيقية", "أثناسيوس", "تاريخ الكنيسة",
        "إمبراطور", "قسطنطين", "طقوس", "رهبنة", "أسقف", "كاثوليك", "أرثوذكس"
    ],
    "شهادات واعترافات علماء وباحثي اللاهوت الغربيين": [
        "اعتراف", "شهادة", "عالم غربي", "مستشرق", "باحث", "لاهوتي يعترف",
        "مسيحي يقول", "أحد علماء"
    ],
    "مناظرات وردود عامة على الشبهات المسيحية": [
        "مناظرة", "رد", "شبهة", "جواب", "حوار", "نقاش", "سؤال", "إجابة",
        "رداً على", "دفاع", "تفنيد"
    ],
}

def classify(text: str) -> str:
    """تصنف النص إلى أحد الأقسام العشرة"""
    if not text:
        return "مناظرات وردود عامة على الشبهات المسيحية"
    text_lower = text.lower()
    scores = {}
    for cat, keywords in CATEGORIES.items():
        score = sum(1 for kw in keywords if kw in text)
        scores[cat] = score
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "مناظرات وردود عامة على الشبهات المسيحية"
    return best

def parse_datetime(s: str):
    """يحول نص التاريخ من تيليغرام إلى datetime"""
    if not s:
        return None
    # صيغة: "24.08.2022 05:49:18 UTC+01:00"
    m = re.match(r'(\d+\.\d+\.\d+\s+\d+:\d+:\d+)', s)
    if m:
        try:
            return datetime.strptime(m.group(1), '%d.%m.%Y %H:%M:%S')
        except:
            pass
    return None

def parse_html_file(html_path: str) -> list:
    """يحلل ملف HTML ويعيد قائمة من المنشورات"""
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    
    messages = []
    for div in soup.select('div.message.default'):
        msg = {}
        msg['id'] = div.get('id', '').replace('message', '').strip()
        
        # التاريخ
        date_el = div.select_one('.pull_right.date.details')
        msg['date_str'] = date_el.get('title', '') if date_el else ''
        msg['dt'] = parse_datetime(msg['date_str'])
        
        # النص الأساسي (كابشن)
        text_el = div.select_one('.text')
        msg['text'] = text_el.get_text(separator=' ', strip=True) if text_el else ''
        
        # الصور
        photos = []
        for a in div.select('a.photo_wrap'):
            href = a.get('href', '')
            if href:
                photos.append(href)
        msg['photos'] = photos
        
        # رابط الرد على رسالة
        reply_el = div.select_one('.reply_to.details')
        msg['reply_to_id'] = ''
        if reply_el:
            link = reply_el.select_one('a')
            if link:
                href = link.get('href', '')
                msg['reply_to_id'] = href.split('message')[-1].strip() if 'message' in href else ''
        
        messages.append(msg)
    return messages

def load_all_messages(export_dir: str) -> list:
    """يقرأ جميع ملفات messages*.html من المجلد"""
    html_files = sorted(
        f for f in os.listdir(export_dir) 
        if f.endswith('.html') and re.match(r'messages\d*\.html', f)
    )
    all_msgs = []
    for html_file in html_files:
        path = os.path.join(export_dir, html_file)
        msgs = parse_html_file(path)
        all_msgs.extend(msgs)
        print(f"  قُرئ {html_file}: {len(msgs)} منشور")
    return all_msgs

def build_albums(messages: list) -> list:
    """
    يدمج الصور التي نُشرت في نفس الدقيقة (ألبوم) تحت عنوان واحد
    يطبق قاعدة ±5 دقائق للصور بدون نص
    """
    # أنشئ فهرس بالـ ID
    id_map = {m['id']: m for m in messages}
    
    # خطوة 1: دمج الألبومات (نفس الثانية)
    used = set()
    albums = []
    
    i = 0
    while i < len(messages):
        msg = messages[i]
        
        # إذا رسالة نصية فقط، أضفها كما هي
        if not msg['photos']:
            albums.append({
                'type': 'text',
                'text': msg['text'],
                'photos': [],
                'dt': msg['dt'],
                'id': msg['id'],
                'reply_to_id': msg['reply_to_id'],
            })
            i += 1
            continue
        
        # ابحث عن صور في نفس الثانية (ألبوم)
        album_photos = list(msg['photos'])
        album_text   = msg['text']
        album_dt     = msg['dt']
        album_id     = msg['id']
        
        j = i + 1
        while j < len(messages):
            nxt = messages[j]
            if not nxt['photos']:
                break
            # نفس الثانية؟
            if nxt['dt'] and msg['dt'] and abs((nxt['dt'] - msg['dt']).total_seconds()) < 2:
                album_photos.extend(nxt['photos'])
                if not album_text and nxt['text']:
                    album_text = nxt['text']
                j += 1
            else:
                break
        
        albums.append({
            'type': 'photo',
            'text': album_text,
            'photos': album_photos,
            'dt': album_dt,
            'id': album_id,
            'reply_to_id': msg['reply_to_id'],
        })
        i = j
    
    # خطوة 2: لمنشورات الصور بدون نص، ابحث عن نص في ردود أو ±5 دقائق
    # أنشئ قائمة النصوص مع أوقاتها
    text_timeline = [(a['dt'], a['text']) for a in albums if a['text'] and a['dt']]
    
    for album in albums:
        if album['type'] == 'photo' and not album['text']:
            # البحث في الرد على رسالة
            if album['reply_to_id']:
                ref = id_map.get(album['reply_to_id'])
                if ref and ref.get('text'):
                    album['text'] = f"[رد] {ref['text']}"
                    continue
            
            # البحث في نافذة ±5 دقائق
            if album['dt']:
                window = timedelta(minutes=5)
                nearby = [
                    txt for (dt, txt) in text_timeline
                    if dt and abs((dt - album['dt']).total_seconds()) <= 300
                ]
                if nearby:
                    # اختر أقرب نص
                    album['text'] = nearby[0]
    
    return albums

def safe_filename(text: str, max_len: int = 80) -> str:
    """يحول النص إلى اسم ملف آمن"""
    if not text:
        text = "بدون_عنوان"
    # أزل المحارف غير المسموح بها في Windows
    text = re.sub(r'[\\/:*?"<>|]', '_', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_len]

def import_to_db(conn, albums, source_name, export_dir, dest_media_base):
    """يستورد الألبومات المعالجة إلى قاعدة البيانات"""
    cur = conn.cursor()
    inserted = 0
    skipped  = 0
    
    for album in albums:
        if not album['photos']:
            continue
        
        title    = album['text'] or 'بدون عنوان'
        category = classify(title)
        
        # انسخ الصور
        dest_dir = os.path.join(dest_media_base, SECT, category)
        os.makedirs(dest_dir, exist_ok=True)
        
        copied_paths = []
        for photo_rel in album['photos']:
            src = os.path.normpath(os.path.join(export_dir, photo_rel))
            if not os.path.exists(src):
                continue
            ext = Path(src).suffix
            safe_name = safe_filename(title)
            # إذا أكثر من صورة أضف رقم
            n = len(copied_paths) + 1
            dest_filename = f"{safe_name}_{n}{ext}" if len(album['photos']) > 1 else f"{safe_name}{ext}"
            dest = os.path.join(dest_dir, dest_filename)
            # تجنب التكرار
            if os.path.exists(dest):
                base, xext = os.path.splitext(dest)
                dest = f"{base}_{album['id']}{xext}"
            shutil.copy2(src, dest)
            copied_paths.append(dest)
        
        if not copied_paths:
            skipped += 1
            continue
        
        # أدرج في قاعدة البيانات (إدراج لكل صورة في الألبوم)
        for cp in copied_paths:
            rel = os.path.relpath(cp, r"e:\المكتبة الشيعية\تطبيق\media")
            
            # تجنب التكرار
            cur.execute("SELECT id FROM documents WHERE full_path = ?", (cp,))
            if cur.fetchone():
                continue
            
            cur.execute("""
                INSERT INTO documents 
                (filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, ocr_text)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (
                os.path.basename(cp),
                rel,
                cp,
                category,
                category,
                SECT,
                category,
                source_name,
                title
            ))
            inserted += 1
        
        # تحديث جدول folders
        cur.execute("""
            INSERT OR IGNORE INTO folders (path, name, parent_path, sect, file_count)
            VALUES (?, ?, '', ?, 0)
        """, (category, category, SECT))
    
    conn.commit()
    return inserted, skipped

# ===============================
# التنفيذ الرئيسي
# ===============================
print("="*70)
print("🚀 بدء الاستيراد الذكي للتصديرات")
print("="*70)

# تفريغ السجلات القديمة لقسم النصارى فقط
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("DELETE FROM documents WHERE sect = ?", (SECT,))
cur.execute("DELETE FROM folders WHERE sect = ?", (SECT,))
conn.commit()
print(f"✅ تم حذف السجلات القديمة لقسم {SECT}")

total_inserted = 0
total_skipped  = 0

for export_dir in EXPORTS:
    print(f"\n📂 معالجة: {os.path.basename(export_dir)}")
    
    msgs   = load_all_messages(export_dir)
    albums = build_albums(msgs)
    
    photo_albums = [a for a in albums if a['photos']]
    no_title     = [a for a in photo_albums if not a['text']]
    
    print(f"  إجمالي الألبومات بالصور: {len(photo_albums)}")
    print(f"  بعنوان: {len(photo_albums)-len(no_title)}")
    print(f"  بدون عنوان بعد البحث: {len(no_title)}")
    
    inserted, skipped = import_to_db(conn, albums, os.path.basename(export_dir), export_dir, MEDIA_DEST)
    total_inserted += inserted
    total_skipped  += skipped
    print(f"  ✅ أُدرج: {inserted} | تخطى: {skipped}")

# تحديث file_count
cur.execute("""
    UPDATE folders 
    SET file_count = (SELECT COUNT(*) FROM documents WHERE documents.folder_path = folders.path)
    WHERE sect = ?
""", (SECT,))
cur.execute("DELETE FROM folders WHERE sect = ? AND file_count = 0", (SECT,))
conn.commit()

print(f"\n{'='*70}")
print(f"🌟 النتائج النهائية:")
print(f"   إجمالي المُدرج: {total_inserted}")
print(f"   المتخطى: {total_skipped}")
print(f"\n📊 توزيع الأقسام:")
cur.execute("SELECT name, file_count FROM folders WHERE sect = ? ORDER BY file_count DESC", (SECT,))
for r in cur.fetchall():
    print(f"   📁 {r[0]}: {r[1]}")
cur.execute("SELECT COUNT(*) FROM documents WHERE sect = ?", (SECT,))
print(f"\n✅ إجمالي وثائق النصارى: {cur.fetchone()[0]}")
conn.close()
