import os
import sys
import glob
import re
import shutil
import sqlite3
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
import bs4

sys.stdout.reconfigure(encoding='utf-8')

# Configuration Paths
EXPORTS = [
    {
        'path': r'C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22 (1)',
        'source_name': 'وثائق عن النصارى والملل'
    },
    {
        'path': r'C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-20',
        'source_name': 'وثائق للمحاورين عن المسيحية'
    },
    {
        'path': r'C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-22',
        'source_name': 'وثائق للرد على النصارى'
    }
]

PROJECT_ROOT = r'E:\المكتبة الشيعية\تطبيق'
MEDIA_BASE = os.path.join(PROJECT_ROOT, 'media', 'christian')
DB_PATH = os.path.join(PROJECT_ROOT, 'server', 'db', 'library.db')

DIR_IMAGES = os.path.join(MEDIA_BASE, 'images')
DIR_VIDEOS = os.path.join(MEDIA_BASE, 'videos')
DIR_AUDIO = os.path.join(MEDIA_BASE, 'audio')
DIR_FILES = os.path.join(MEDIA_BASE, 'files')

for d in [DIR_IMAGES, DIR_VIDEOS, DIR_AUDIO, DIR_FILES]:
    os.makedirs(d, exist_ok=True)

# ----------------------------------------------------
# 1. Arabic Text Formatting & Card Generator
# ----------------------------------------------------
def reshape_text(text):
    if not text:
        return ""
    try:
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception:
        return text

def create_text_card(title, body_snippet, category, tags, output_path):
    width, height = 800, 1000
    img = Image.new('RGB', (width, height), color=(15, 23, 42)) # Slate-900
    draw = ImageDraw.Draw(img)
    
    # Outer Border
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(51, 65, 85), width=2)
    # Gold header accent
    draw.rectangle([(20, 20), (width - 20, 30)], fill=(245, 158, 11))
    
    font_path_title = r'C:\Windows\Fonts\arialbd.ttf'
    font_path_body = r'C:\Windows\Fonts\tahoma.ttf'
    
    try:
        font_cat = ImageFont.truetype(font_path_title, 24)
        font_title = ImageFont.truetype(font_path_title, 32)
        font_body = ImageFont.truetype(font_path_body, 23)
        font_tag = ImageFont.truetype(font_path_body, 20)
    except Exception:
        font_cat = font_title = font_body = font_tag = ImageFont.load_default()
    
    # Category badge
    cat_text = reshape_text(f"❖  {category}")
    draw.text((width - 50, 70), cat_text, fill=(245, 158, 11), font=font_cat, anchor="ra")
    draw.line([(50, 115), (width - 50, 115)], fill=(51, 65, 85), width=1)
    
    # Title
    title_reshaped = reshape_text(title)
    draw.text((width - 50, 145), title_reshaped, fill=(241, 245, 249), font=font_title, anchor="ra")
    draw.line([(50, 215), (width - 50, 215)], fill=(30, 41, 59), width=1)
    
    # Body
    y_offset = 240
    words = body_snippet.split()
    lines = []
    curr = []
    for w in words:
        curr.append(w)
        if len(' '.join(curr)) > 40:
            lines.append(' '.join(curr))
            curr = []
    if curr:
        lines.append(' '.join(curr))
        
    for line in lines[:16]:
        reshaped_line = reshape_text(line)
        draw.text((width - 50, y_offset), reshaped_line, fill=(203, 213, 225), font=font_body, anchor="ra")
        y_offset += 38
        
    # Tags
    if tags:
        tag_str = "  •  ".join([f"#{t}" for t in tags[:4]])
        tag_reshaped = reshape_text(tag_str)
        draw.line([(50, height - 85), (width - 50, height - 85)], fill=(51, 65, 85), width=1)
        draw.text((width - 50, height - 55), tag_reshaped, fill=(148, 163, 184), font=font_tag, anchor="ra")
        
    img.save(output_path, quality=88)

# ----------------------------------------------------
# 2. Date & Hashtag Helpers
# ----------------------------------------------------
def parse_date(date_str):
    if not date_str:
        return None
    # Example format: 06.09.2023 23:21:08 UTC+01:00 or 20.08.2026 14:20:00
    m = re.search(r'(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})', date_str)
    if m:
        d, mon, y, h, mi, s = map(int, m.groups())
        return datetime(y, mon, d, h, mi, s)
    return None

def extract_hashtags(text):
    if not text:
        return []
    tags = re.findall(r'#([^\s#،,.\(\)\[\]]+)', text)
    clean = []
    for t in tags:
        t_clean = t.replace('_', ' ').strip()
        if t_clean and len(t_clean) > 1 and t_clean not in clean:
            clean.append(t_clean)
    return clean

# ----------------------------------------------------
# 3. Categorization into Proper Folders
# ----------------------------------------------------
CATEGORIES = [
    'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل',
    'ألوهية المسيح وعقيدة الثالوث ونقد التجسد',
    'قضية الصلب والفداء والقيامة والصلب المزعوم',
    'المرأة والأسرة والزواج والطلاق في المسيحية',
    'الأخلاق والتشريعات والعنف والحروب في الكتاب المقدس',
    'دراسات وبشارات العهد القديم ونبوءات النبي محمد ﷺ',
    'دراسات العهد الجديد ورسائل بولس ونقد تلاميذه',
    'تاريخ الكنيسة والمجامع والرهبنة والباباوات والطقوس',
    'شهادات واعترافات علماء وباحثي اللاهوت الغربيين',
    'مناظرات وردود عامة على الشبهات المسيحية'
]

def determine_category(text, tags):
    combined = (text + ' ' + ' '.join(tags)).lower()
    
    # 1. تحريف الكتاب المقدس
    if any(k in combined for k in [
        'تحريف', 'مخطوط', 'نقد نصي', 'مجهول', 'سفر مفقود', 'تناقض', 'اصحاح مضاف', 'فصل مضاف',
        'قانونية الأسفار', 'الاسفار القانونية', 'السبعينية', 'الفولغاتا', 'النسخ القديمة',
        'تلفيق', 'مخطوطات', 'سينائية', 'فاتيكانية', 'اسكندرية', 'نص محرف', 'نصوص محرفة'
    ]):
        return 'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل'
        
    # 2. ألوهية المسيح وعقيدة الثالوث
    if any(k in combined for k in [
        'الوهية', 'ألوهية', 'ثالوث', 'الثالوث', 'ابن الله', 'موت الاله', 'طبيعة المسيح',
        'لاهوت', 'ناسوت', 'تجسد', 'التجسد', 'اقنوم', 'أقانيم', 'يسوع ليس اله', 'عبادة المسيح',
        'أنا والآب واحد', 'في البدء كان الكلمة', 'يوحنا 1/1', 'المونوفيزية', 'النسطورية'
    ]):
        return 'ألوهية المسيح وعقيدة الثالوث ونقد التجسد'
        
    # 3. الصلب والفداء
    if any(k in combined for k in [
        'صلب', 'الصلب', 'فداء', 'الفداء', 'قيامة', 'القيامة', 'المزامير تتنبأ', 'مزمور 22',
        'صليب', 'كفارة', 'الخطيئة الاصلية', 'موت المسيح', 'القبر الفارغ', 'جسد المسيح'
    ]):
        return 'قضية الصلب والفداء والقيامة والصلب المزعوم'
        
    # 4. المرأة والأسرة
    if any(k in combined for k in [
        'مرأة', 'مرأه', 'مراة', 'نساء', 'حجاب', 'غطاء', 'ميراث', 'زواج', 'طلاق', 'حواء',
        'تعدد الزوجات', 'ضرب المرأة', 'خضوع المرأة', 'بولس والمرأة'
    ]):
        return 'المرأة والأسرة والزواج والطلاق في المسيحية'
        
    # 5. الأخلاق والتشريعات والعنف
    if any(k in combined for k in [
        'قتل', 'جنس', 'عنف', 'دماء', 'ابادة', 'إبادة', 'سبي', 'نجس', 'ملعون', 'ارهاب',
        'حد الردة', 'حرق المدن', 'الجزية', 'سفر يشوع', 'سفر القضاة', 'شريعة العهد القديم',
        'رجم', 'محارم', 'زنا المحارم', 'حزقيال 23', 'نشيد الانشاد'
    ]):
        return 'الأخلاق والتشريعات والعنف والحروب في الكتاب المقدس'
        
    # 6. العهد القديم والبشارات
    if any(k in combined for k in [
        'بشارات', 'بشارة', 'فارقليط', 'البارقليط', 'محمد في الكتاب', 'نبي مثل موسى',
        'تثنية 18', 'قيدار', 'فاران', 'مكة في التوراة', 'اشعياء', 'ارميا', 'دانيال',
        'مزامير', 'داود', 'موسى', 'سفر التكوين', 'سفر الخروج'
    ]):
        return 'دراسات وبشارات العهد القديم ونبوءات النبي محمد ﷺ'
        
    # 7. العهد الجديد وبولس
    if any(k in combined for k in [
        'بولس', 'رسائل بولس', 'متى', 'مرقس', 'لوقا', 'يوحنا', 'اعمال الرسل',
        'رؤيا يوحنا', 'بطرس', 'يعقوب', 'يهوذا', 'كاتب مجهول', 'يوحنا الحبيب', 'الاناجيل الازائية'
    ]):
        return 'دراسات العهد الجديد ورسائل بولس ونقد تلاميذه'
        
    # 8. تاريخ الكنيسة والمجامع
    if any(k in combined for k in [
        'مجمع نيقية', 'مجمع قسطنطينية', 'مجمع افسس', 'مجمع خلقيدونية', 'مجامع',
        'شنودة', 'بيشوي', 'ارثوذكس', 'كاثوليك', 'بروتستانت', 'قديس', 'ايقون', 'بابا الفاتيكان',
        'صكوك الغفران', 'محاكم التفتيش', 'رهبنة', 'رهبان', 'اباء الكنيسة', 'اوريجانوس', 'جيروم', 'اوغسطينوس'
    ]):
        return 'تاريخ الكنيسة والمجامع والرهبنة والباباوات والطقوس'

    # 9. شهادات واعترافات علماء اللاهوت
    if any(k in combined for k in [
        'بارت إيرمان', 'بارت ايرمان', 'بروس متزجر', 'علماء اللاهوت', 'اعتراف', 'دائرة المعارف الكتابية',
        'قاموس الكتاب المقدس', 'الاب متى المسكين', 'الخوري', 'القس', 'الشماس', 'تفسير انطونيوس فكري',
        'تفسير تادرس يعقوب', 'بارينجهام', 'تشندورف'
    ]):
        return 'شهادات واعترافات علماء وباحثي اللاهوت الغربيين'
        
    return 'مناظرات وردود عامة على الشبهات المسيحية'

# ----------------------------------------------------
# 4. Smart Title Extractor
# ----------------------------------------------------
def clean_title(full_text, tags, default_id):
    if not full_text or not full_text.strip():
        if tags:
            return f"وثيقة: {' - '.join(tags[:2])}"
        return f"وثيقة نقدية #{default_id}"

    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    candidate_lines = []
    
    for line in lines:
        cleaned = re.sub(r'#\w+', '', line).strip()
        cleaned = re.sub(r'https?://\S+', '', cleaned).strip()
        cleaned = re.sub(r'@\w+', '', cleaned).strip()
        cleaned = re.sub(r'^[\s\-•*،:.\(\)\[\]«»❖📌🔎📚👇]+', '', cleaned).strip()
        cleaned = re.sub(r'[\s\-•*،:.\(\)\[\]«»❖📌🔎📚👇]+$', '', cleaned).strip()
        if len(cleaned) >= 6:
            candidate_lines.append(cleaned)
            
    if candidate_lines:
        chosen = candidate_lines[0]
    else:
        chosen = lines[0]

    chosen = re.sub(r'#(\w+)', r'\1', chosen).strip()
    chosen = re.sub(r'https?://\S+', '', chosen).strip()
    chosen = re.sub(r'^[\s\-•*،:.\(\)\[\]«»❖📌🔎📚👇]+', '', chosen).strip()

    if len(chosen) > 95:
        sentences = re.split(r'[.!?؟\n]', chosen)
        if sentences and len(sentences[0].strip()) >= 15:
            chosen = sentences[0].strip()
        else:
            words = chosen[:90].rsplit(' ', 1)[0]
            chosen = words + '...'
            
    return chosen if len(chosen) >= 3 else f"وثيقة #{default_id}"

# ----------------------------------------------------
# 5. Core Pipeline: Parse, Link Context, Merge Albums
# ----------------------------------------------------
def process_export(export_info):
    export_dir = export_info['path']
    src_name = export_info['source_name']
    
    print(f"\n==========================================================")
    print(f"📦 معالجة التصدير: {src_name}")
    print(f"📁 المسار: {export_dir}")
    print(f"==========================================================")
    
    if not os.path.exists(export_dir):
        print(f"⚠️ المسار غير موجود، تم التخطي: {export_dir}")
        return []

    # 1. Copy photos to media folder
    src_photos_dir = os.path.join(export_dir, 'photos')
    copied_count = 0
    if os.path.exists(src_photos_dir):
        for pf in os.listdir(src_photos_dir):
            sp = os.path.join(src_photos_dir, pf)
            dp = os.path.join(DIR_IMAGES, pf)
            if not os.path.exists(dp) and os.path.isfile(sp):
                shutil.copy2(sp, dp)
                copied_count += 1
    print(f"  ✓ تم فحص ونسخ {copied_count} صورة جديدة إلى {DIR_IMAGES}")

    # 2. Parse HTML Messages
    html_files = sorted(glob.glob(os.path.join(export_dir, 'messages*.html')))
    print(f"  ✓ عدد ملفات الرسائل (HTML): {len(html_files)}")
    
    raw_msgs = []
    for hf in html_files:
        with open(hf, 'r', encoding='utf-8') as f:
            soup = bs4.BeautifulSoup(f.read(), 'html.parser')
        msgs = soup.find_all('div', class_='message')
        for m in msgs:
            classes = m.get('class', [])
            if 'service' in classes:
                continue
            
            m_id = m.get('id', '')
            
            # Text
            text_div = m.find('div', class_='text')
            text = text_div.get_text(separator='\n', strip=True) if text_div else ''
            
            # Date
            date_div = m.find('div', class_='date')
            date_str = date_div.get('title', '') if date_div else ''
            dt = parse_date(date_str)
            
            # Reply To
            reply_div = m.find('div', class_='reply_to')
            reply_to_id = None
            if reply_div:
                link = reply_div.find('a')
                if link and link.get('href', '').startswith('#go_to_message'):
                    reply_to_id = link.get('href').replace('#go_to_', '')
                    
            # Media
            photos = []
            media_wrap = m.find('div', class_='media_wrap')
            if media_wrap:
                for a in media_wrap.find_all('a', class_='photo_wrap'):
                    href = a.get('href')
                    if href:
                        photos.append(os.path.basename(href))
                        
            raw_msgs.append({
                'id': m_id,
                'dt': dt,
                'date_str': date_str,
                'text': text,
                'reply_to_id': reply_to_id,
                'photos': photos,
                'src_name': src_name
            })
            
    print(f"  ✓ إجمالي الرسائل المقروءة: {len(raw_msgs)}")
    
    # 3. Context & Proximity Association (Reply-to & 5-minute fallback)
    msg_map = {m['id']: m for m in raw_msgs}
    
    for i, m in enumerate(raw_msgs):
        if m['photos'] and not m['text']:
            # 1. Check if this message replied to a text message
            if m['reply_to_id'] and m['reply_to_id'] in msg_map and msg_map[m['reply_to_id']]['text']:
                m['text'] = msg_map[m['reply_to_id']]['text']
                
            # 2. Check if a nearby text message replied to this photo message
            if not m['text']:
                for j in range(max(0, i - 5), min(len(raw_msgs), i + 6)):
                    other = raw_msgs[j]
                    if other['reply_to_id'] == m['id'] and other['text']:
                        m['text'] = other['text']
                        break
                        
            # 3. 5-Minute Window Proximity Fallback: look before/after for nearest explanatory text
            if not m['text'] and m['dt']:
                # Look backwards first
                for j in range(i - 1, max(-1, i - 15), -1):
                    other = raw_msgs[j]
                    if other['text'] and other['dt']:
                        diff = abs((m['dt'] - other['dt']).total_seconds())
                        if diff <= 300: # within 5 minutes
                            m['text'] = other['text']
                            break
                # If still not found, look forwards
                if not m['text']:
                    for j in range(i + 1, min(len(raw_msgs), i + 15)):
                        other = raw_msgs[j]
                        if other['text'] and other['dt']:
                            diff = abs((other['dt'] - m['dt']).total_seconds())
                            if diff <= 300: # within 5 minutes
                                m['text'] = other['text']
                                break

    # 4. Cluster & Album Grouping (Merging multiple photos within same topic)
    clusters = []
    curr_c = None
    
    for m in raw_msgs:
        if not m['photos'] and not m['text']:
            continue
            
        if curr_c is None:
            curr_c = {
                'ids': [m['id']],
                'start_dt': m['dt'],
                'last_dt': m['dt'],
                'texts': [m['text']] if m['text'] else [],
                'photos': list(m['photos']),
                'src_name': src_name
            }
            continue
            
        time_diff = None
        if m['dt'] and curr_c['last_dt']:
            time_diff = abs((m['dt'] - curr_c['last_dt']).total_seconds())
            
        should_merge = False
        if time_diff is not None and time_diff <= 300: # within 5 minutes
            # Case A: Same text or one has text and one has photos
            if m['text'] and curr_c['texts'] and m['text'] == curr_c['texts'][0]:
                should_merge = True
            elif curr_c['photos'] and m['photos'] and not m['text']:
                should_merge = True
            elif not curr_c['photos'] and m['photos'] and curr_c['texts'] and not m['text']:
                should_merge = True
            elif curr_c['photos'] and not m['photos'] and m['text'] and not curr_c['texts']:
                should_merge = True
            elif time_diff <= 90 and (not curr_c['texts'] or not m['text'] or m['text'] == curr_c['texts'][-1]):
                should_merge = True
                
        if should_merge:
            curr_c['ids'].append(m['id'])
            curr_c['last_dt'] = m['dt'] or curr_c['last_dt']
            if m['text'] and m['text'] not in curr_c['texts']:
                curr_c['texts'].append(m['text'])
            curr_c['photos'].extend(m['photos'])
        else:
            clusters.append(curr_c)
            curr_c = {
                'ids': [m['id']],
                'start_dt': m['dt'],
                'last_dt': m['dt'],
                'texts': [m['text']] if m['text'] else [],
                'photos': list(m['photos']),
                'src_name': src_name
            }
            
    if curr_c:
        clusters.append(curr_c)
        
    print(f"  ✓ تم دمج وتجميع {len(clusters)} موضوع/وثيقة متكاملة (ألبومات ومقالات).")
    return clusters

# ----------------------------------------------------
# 6. Database Insertion & Final Indexing
# ----------------------------------------------------
def run_all_imports():
    print("==========================================================")
    print("🚀 بدء تشغيل الفهرسة الذكية الكاملة لوثائق النصارى والمسيحية")
    print("==========================================================")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Setup Folders in DB
    print("\n[1/3] تجهيز وتثبيت مجلدات الأقسام المنطقية...")
    for cat in CATEGORIES:
        cursor.execute("""
            INSERT INTO folders (path, name, parent_path, sect)
            VALUES (?, ?, NULL, 'نصارى')
            ON CONFLICT(path) DO UPDATE SET name=excluded.name, parent_path=NULL, sect='نصارى'
        """, (cat, cat))
    conn.commit()
    
    # 2. Process all exports
    all_clusters = []
    for exp in EXPORTS:
        clusters = process_export(exp)
        all_clusters.extend(clusters)
        
    print(f"\n==========================================================")
    print(f"📊 إجمالي المواضيع والوثائق المجمعة من كل القنوات: {len(all_clusters)}")
    print(f"==========================================================")
    
    # 3. Insert Documents
    print("\n[2/3] إدراج الوثائق والألبومات والوسوم في قاعدة البيانات...")
    
    insert_doc_sql = """
        INSERT INTO documents (
            filename, relative_path, full_path, folder_name, folder_path,
            sect, category, book_source, file_size, ocr_status, ocr_text,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'نصارى', 'attack', ?, ?, 'completed', ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(relative_path) DO UPDATE SET
            filename=excluded.filename,
            full_path=excluded.full_path,
            folder_name=excluded.folder_name,
            folder_path=excluded.folder_path,
            sect='نصارى',
            category='attack',
            book_source=excluded.book_source,
            ocr_status='completed',
            ocr_text=excluded.ocr_text,
            updated_at=CURRENT_TIMESTAMP
    """

    insert_tag_sql = """
        INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual)
        VALUES (?, ?, 1)
    """

    inserted = 0
    text_cards_count = 0
    seen_rel_paths = set()

    for idx, c in enumerate(all_clusters):
        full_text = "\n\n".join(c['texts']).strip()
        tags = extract_hashtags(full_text)
        cat = determine_category(full_text, tags)
        folder_path = cat
        title = clean_title(full_text, tags, c['ids'][0])
        
        main_img_full = None
        main_img_rel = None
        
        # Deduplicate photos in cluster
        unique_photos = []
        for p in c['photos']:
            if p not in unique_photos and os.path.exists(os.path.join(DIR_IMAGES, p)):
                unique_photos.append(p)
                
        if unique_photos:
            main_photo = unique_photos[0]
            main_img_full = os.path.join(DIR_IMAGES, main_photo)
            main_img_rel = f"media/christian/images/{main_photo}"
            
            if len(unique_photos) > 1:
                book_source = f"{c['src_name']} (ألبوم {len(unique_photos)} صور)"
            else:
                book_source = c['src_name']
        else:
            # Text Only -> Generate visual card
            card_name = f"text_card_{c['src_name'][:5]}_{c['ids'][0]}.jpg"
            card_full = os.path.join(DIR_IMAGES, card_name)
            create_text_card(title, full_text[:450], cat, tags, card_full)
            text_cards_count += 1
            main_img_full = card_full
            main_img_rel = f"media/christian/images/{card_name}"
            book_source = f"{c['src_name']} (مقال وبحث نصوص)"

        if main_img_rel in seen_rel_paths:
            # If photo was used in another cluster, disambiguate relative path with id
            main_img_rel = f"{main_img_rel}#{c['ids'][0]}"
        seen_rel_paths.add(main_img_rel)

        file_size = os.path.getsize(main_img_full) if os.path.exists(main_img_full) else 0
        date_created = c['start_dt'].strftime('%Y-%m-%d %H:%M:%S') if c['start_dt'] else datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute(insert_doc_sql, (
            title,
            main_img_rel,
            main_img_full,
            cat,
            folder_path,
            book_source,
            file_size,
            full_text,
            date_created
        ))
        
        doc_id = cursor.lastrowid
        if not doc_id:
            row = cursor.execute("SELECT id FROM documents WHERE relative_path = ?", (main_img_rel,)).fetchone()
            doc_id = row[0] if row else None

        if doc_id:
            for t in tags:
                cursor.execute(insert_tag_sql, (doc_id, t))

        inserted += 1
        if inserted % 250 == 0 or inserted == len(all_clusters):
            print(f"  ... تم فهرسة وتوثيق {inserted} / {len(all_clusters)} وثيقة وموضوع")

    # 4. Update folder file counts
    print("\n[3/3] تحديث إحصائيات المجلدات...")
    cursor.execute("""
        UPDATE folders
        SET file_count = (
            SELECT COUNT(*) FROM documents WHERE documents.folder_path = folders.path
        )
    """)
    conn.commit()

    print("\n==========================================================")
    print("📈 إحصائيات المجلدات في قسم النصارى بعد الفهرسة الذكية:")
    print("==========================================================")
    cursor.execute("SELECT name, file_count FROM folders WHERE sect = 'نصارى' ORDER BY file_count DESC")
    for r in cursor.fetchall():
        print(f"  📁 {r[0]}: {r[1]} وثيقة")

    cursor.execute("SELECT COUNT(*) FROM documents WHERE sect = 'نصارى'")
    total_christian = cursor.fetchone()[0]
    print(f"\n🌟 إجمالي وثائق قسم النصارى المفهرسة: {total_christian} وثيقة")
    print(f"🎨 بطاقات المقالات النصية المنشأة: {text_cards_count}")
    print("==========================================================")

    conn.close()

if __name__ == '__main__':
    run_all_imports()
