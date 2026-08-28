"""
الاستيراد الذكي المُصحح - النسخة 3
=====================================
إصلاحات:
1. قناة (2) [ChatExport_2026-08-22 (2)] هي عن الشيعة وليس النصارى → تُعالج تحت قسم مختلف
2. كل ألبوم (صور متعددة) يُدرج كسجل واحد فقط مع قائمة مسارات الصور
3. العنوان يؤخذ من أول نص في الألبوم، ثم الردود، ثم نافذة ±5 دقائق
"""
import sys, os, re, sqlite3, shutil, json
from pathlib import Path
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

# ============================
# إعدادات
# ============================

# كل قناة لها قسمها الصحيح
EXPORT_CONFIG = {
    r"C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22 (2)": {
        "sect": "شيعة",          # قناة عن نقد الشيعة وردود عليهم
        "label": "الرد على الشيعة",
    },
    r"C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22 (1)": {
        "sect": "نصارى",
        "label": "وثائق للمحاورين عن المسيحية",
    },
    r"C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22": {
        "sect": "نصارى",
        "label": "وثائق للرد على النصارى",
    },
}

MEDIA_BASE = r"e:\المكتبة الشيعية\تطبيق\media"
DB_PATH    = r"e:\المكتبة الشيعية\تطبيق\server\db\library.db"

# أقسام النصارى
CHRISTIAN_CATS = {
    "تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل": [
        "تحريف", "نقد نصي", "مخطوط", "بابيرس", "ترجمة", "تناقض", "إنجيل", "أناجيل",
        "نسخة", "مرقس", "متى", "لوقا", "يوحنا", "نص", "كاتب", "كتاب مقدس", "مجمع نيقية"
    ],
    "ألوهية المسيح وعقيدة الثالوث ونقد التجسد": [
        "ألوهية", "الثالوث", "تجسد", "ابن الله", "المسيح إله", "لاهوت", "ناسوت",
        "طبيعتان", "أقنوم", "يسوع", "المسيح", "الله الابن", "إله", "بابا شنوده",
        "كلمة الله", "لم يقل إنه إله", "ليس إله"
    ],
    "قضية الصلب والفداء والقيامة والصلب المزعوم": [
        "صلب", "فداء", "قيامة", "خلاص", "موت المسيح", "صليب", "الفادي",
        "كفارة", "ذبيحة", "قبر", "هل صُلب", "هل صلب"
    ],
    "المرأة والأسرة والزواج والطلاق في المسيحية": [
        "المرأة", "زواج", "طلاق", "عائلة", "أسرة", "نساء", "الأنثى",
        "بولس والمرأة", "سنهدرين", "فتاة", "ثلاث سنوات"
    ],
    "الأخلاق والتشريعات والعنف والحروب في الكتاب المقدس": [
        "أخلاق", "عنف", "حرب", "قتل", "ذبح", "جزية", "سبي", "غنيمة",
        "الله يأمر بالقتل", "إبادة", "تشريع", "العماليق"
    ],
    "دراسات وبشارات العهد القديم ونبوءات النبي محمد ﷺ": [
        "عهد قديم", "بشارة", "نبوءة", "نبوة", "محمد في الكتاب",
        "اشعياء", "تثنية", "مزمور", "قيدار", "البارقليط", "الباركليتوس",
        "سفر طوبيا", "موسى", "العهد القديم"
    ],
    "دراسات العهد الجديد ورسائل بولس ونقد تلاميذه": [
        "عهد جديد", "رسالة بولس", "بولس", "تلاميذ", "الرسل", "أعمال الرسل",
        "كورنثوس", "غلاطية", "رومية", "عبرانيين", "يهوذا", "جيروم"
    ],
    "تاريخ الكنيسة والمجامع والرهبنة والباباوات والطقوس": [
        "مجمع", "كنيسة", "بابا", "رهبان", "أثناسيوس", "تاريخ الكنيسة",
        "إمبراطور", "قسطنطين", "طقوس", "رهبنة", "أسقف", "كاثوليك", "أرثوذكس",
        "يوحنا ذهبي الفم", "أكليمنضس", "أب الكنيسة"
    ],
    "شهادات واعترافات علماء وباحثي اللاهوت الغربيين": [
        "لاهوتي يعترف", "مسيحي يقول", "أحد علماء", "أستاذ", "بروفيسور",
        "باحث مسيحي", "عالم غربي", "ويليام", "فيليب", "شيفر", "ديورانت",
        "أعترف", "اعتراف", "شهادة"
    ],
    "مناظرات وردود عامة على الشبهات المسيحية": [],  # الفئة الافتراضية
}

# أقسام الشيعة
SHIA_CATS = {
    "الرد على شبهات التشيع والدفاع عن الصحابة": [
        "شيعة", "شيعي", "روافض", "رافضة", "علي بن أبي طالب", "الغدير",
        "المتعة", "تحريف القرآن", "فدك", "فاطمة", "الزهراء", "الخميني",
        "الشهادة الثالثة", "الأذان", "التقية", "كربلاء", "الحسين",
        "أبو بكر", "عمر", "عثمان", "عائشة", "حفصة", "الخلفاء الراشدين",
        "الإمام", "الرافضة"
    ],
    "مناظرات وردود على الشيعة": [],  # افتراضي
}

def classify(text: str, categories: dict) -> str:
    if not text:
        return list(categories.keys())[-1]  # الفئة الافتراضية
    scores = {}
    for cat, keywords in categories.items():
        score = sum(1 for kw in keywords if kw in text)
        scores[cat] = score
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return list(categories.keys())[-1]
    return best

def parse_datetime(s: str):
    if not s:
        return None
    m = re.match(r'(\d+\.\d+\.\d+\s+\d+:\d+:\d+)', s)
    if m:
        try:
            return datetime.strptime(m.group(1), '%d.%m.%Y %H:%M:%S')
        except:
            pass
    return None

def parse_html_file(html_path: str) -> list:
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    messages = []
    for div in soup.select('div.message.default'):
        msg = {}
        msg['id'] = div.get('id', '').replace('message', '').strip()
        date_el = div.select_one('.pull_right.date.details')
        msg['date_str'] = date_el.get('title', '') if date_el else ''
        msg['dt'] = parse_datetime(msg['date_str'])
        text_el = div.select_one('.text')
        msg['text'] = text_el.get_text(separator=' ', strip=True) if text_el else ''
        photos = []
        for a in div.select('a.photo_wrap'):
            href = a.get('href', '')
            if href:
                photos.append(href)
        msg['photos'] = photos
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
    """يدمج الصور ذات نفس الطابع الزمني في ألبوم واحد"""
    id_map = {m['id']: m for m in messages}
    albums = []
    i = 0
    while i < len(messages):
        msg = messages[i]
        if not msg['photos']:
            # رسالة نصية فقط
            if msg['text']:
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
        
        # جمع صور الألبوم (نفس الثانية)
        album_photos = list(msg['photos'])
        album_text   = msg['text']
        album_dt     = msg['dt']
        album_id     = msg['id']
        
        j = i + 1
        while j < len(messages):
            nxt = messages[j]
            if not nxt['photos']:
                break
            if nxt['dt'] and msg['dt'] and abs((nxt['dt'] - msg['dt']).total_seconds()) < 3:
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
    
    # البحث عن نص للصور بدون عنوان
    text_timeline = [(a['dt'], a['text']) for a in albums if a['text'] and a['dt']]
    
    for album in albums:
        if album['type'] == 'photo' and not album['text']:
            # البحث في الرد على رسالة
            if album['reply_to_id']:
                ref = id_map.get(album['reply_to_id'])
                if ref and ref.get('text'):
                    album['text'] = ref['text']
                    continue
            # البحث في نافذة ±5 دقائق
            if album['dt']:
                nearby = sorted(
                    [(abs((dt - album['dt']).total_seconds()), txt)
                     for (dt, txt) in text_timeline if dt],
                    key=lambda x: x[0]
                )
                if nearby and nearby[0][0] <= 300:
                    album['text'] = nearby[0][1]
    
    return albums

def safe_filename(text: str, max_len: int = 70) -> str:
    if not text:
        text = "بدون_عنوان"
    text = re.sub(r'[\\/:*?"<>|\n\r\t#]', '_', text)
    text = re.sub(r'_+', '_', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_len]

def import_to_db(conn, albums, source_name, export_dir, sect, categories):
    cur = conn.cursor()
    inserted = 0
    
    for album in albums:
        if not album['photos']:
            continue
        
        title    = (album['text'] or '').strip() or 'بدون عنوان'
        category = classify(title, categories)
        
        # انسخ الصور إلى وجهتها
        dest_dir = os.path.join(MEDIA_BASE, sect, category)
        os.makedirs(dest_dir, exist_ok=True)
        
        # جمع كل مسارات الصور المنسوخة
        copied_paths = []
        safe_name = safe_filename(title)
        
        for idx, photo_rel in enumerate(album['photos']):
            src = os.path.normpath(os.path.join(export_dir, photo_rel))
            if not os.path.exists(src):
                continue
            ext = Path(src).suffix
            # اسم ملف: العنوان + رقم صورة (إذا ألبوم متعدد)
            if len(album['photos']) > 1:
                dest_filename = f"{safe_name}_{idx+1}{ext}"
            else:
                dest_filename = f"{safe_name}{ext}"
            dest = os.path.join(dest_dir, dest_filename)
            # تجنب التضارب في الأسماء
            counter = 1
            while os.path.exists(dest):
                dest = os.path.join(dest_dir, f"{safe_name}_{album['id']}_{idx+1}{ext}")
                counter += 1
                if counter > 5:
                    break
            try:
                shutil.copy2(src, dest)
                copied_paths.append(dest)
            except Exception as e:
                print(f"    ⚠️ خطأ في نسخ {src}: {e}")
        
        if not copied_paths:
            continue
        
        # إدراج سجل واحد للألبوم كله مع مسارات الصور مدمجة
        primary_path = copied_paths[0]
        all_paths_json = json.dumps(copied_paths, ensure_ascii=False)
        rel = os.path.relpath(primary_path, MEDIA_BASE)
        
        # تجنب التكرار
        cur.execute("SELECT id FROM documents WHERE full_path = ?", (primary_path,))
        if cur.fetchone():
            continue
        
        cur.execute("""
            INSERT INTO documents 
            (filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, ocr_text)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            os.path.basename(primary_path),
            rel,
            primary_path,
            category,
            category,
            sect,
            category,
            source_name,
            title
        ))
        inserted += 1
        
        # إضافة مسارات الصور الإضافية في جدول مستقل (إن وُجد) أو كعلامات
        # لكل صور الألبوم الإضافية: تُدرج بنفس العنوان مع رقم
        for extra_path in copied_paths[1:]:
            rel_extra = os.path.relpath(extra_path, MEDIA_BASE)
            cur.execute("SELECT id FROM documents WHERE full_path = ?", (extra_path,))
            if cur.fetchone():
                continue
            cur.execute("""
                INSERT INTO documents 
                (filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, ocr_text)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (
                os.path.basename(extra_path),
                rel_extra,
                extra_path,
                category,
                category,
                sect,
                category,
                source_name,
                title   # نفس العنوان = صورة من نفس الألبوم
            ))
            inserted += 1
        
        # تأكد من وجود مدخل المجلد
        cur.execute("""
            INSERT OR IGNORE INTO folders (path, name, parent_path, sect, file_count)
            VALUES (?, ?, '', ?, 0)
        """, (category, category, sect))
    
    conn.commit()
    return inserted

# ===============================
# التنفيذ الرئيسي
# ===============================
print("="*70)
print("🚀 الاستيراد الذكي V3 - مع إصلاح القنوات والألبومات")
print("="*70)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# تفريغ كل السجلات القديمة لكلا القسمين
for sect_to_clear in ['نصارى', 'شيعة']:
    cur.execute("DELETE FROM documents WHERE sect = ?", (sect_to_clear,))
    cur.execute("DELETE FROM folders WHERE sect = ?", (sect_to_clear,))
conn.commit()
print("✅ تم مسح السجلات القديمة")

total_inserted = 0

for export_dir, config in EXPORT_CONFIG.items():
    sect = config['sect']
    label = config['label']
    categories = CHRISTIAN_CATS if sect == 'نصارى' else SHIA_CATS
    
    print(f"\n📂 {os.path.basename(export_dir)} → قسم [{sect}] - {label}")
    
    msgs   = load_all_messages(export_dir)
    albums = build_albums(msgs)
    
    photo_albums = [a for a in albums if a['photos']]
    no_title     = [a for a in photo_albums if not a['text']]
    
    print(f"  📊 إجمالي المنشورات: {len(msgs)}")
    print(f"  📸 الألبومات بالصور: {len(photo_albums)}")
    print(f"  ✅ بعنوان: {len(photo_albums) - len(no_title)}")
    print(f"  ⚠️ بدون عنوان بعد البحث: {len(no_title)}")
    
    inserted = import_to_db(conn, albums, os.path.basename(export_dir), export_dir, sect, categories)
    total_inserted += inserted
    print(f"  💾 أُدرج: {inserted} وثيقة")

# تحديث file_count
cur.execute("""
    UPDATE folders 
    SET file_count = (SELECT COUNT(*) FROM documents WHERE documents.folder_path = folders.path)
""")
cur.execute("DELETE FROM folders WHERE file_count = 0")
conn.commit()

print(f"\n{'='*70}")
print(f"🌟 النتائج النهائية: {total_inserted} وثيقة مُدرجة")

for sect_name in ['نصارى', 'شيعة']:
    print(f"\n📁 قسم [{sect_name}]:")
    cur.execute("SELECT name, file_count FROM folders WHERE sect=? ORDER BY file_count DESC", (sect_name,))
    for r in cur.fetchall():
        print(f"   📁 {r[0]}: {r[1]}")
    cur.execute("SELECT COUNT(*) FROM documents WHERE sect=?", (sect_name,))
    print(f"   ➡️ الإجمالي: {cur.fetchone()[0]}")

conn.close()
