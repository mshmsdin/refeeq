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
EXPORT_DIR = r'C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-20'
PROJECT_ROOT = r'E:\المكتبة الشيعية\تطبيق'
MEDIA_BASE = os.path.join(PROJECT_ROOT, 'media', 'christian')
DB_PATH = os.path.join(PROJECT_ROOT, 'server', 'db', 'library.db')

# Ensure target directories exist
DIR_IMAGES = os.path.join(MEDIA_BASE, 'images')
DIR_VIDEOS = os.path.join(MEDIA_BASE, 'videos')
DIR_AUDIO = os.path.join(MEDIA_BASE, 'audio')
DIR_FILES = os.path.join(MEDIA_BASE, 'files')

for d in [DIR_IMAGES, DIR_VIDEOS, DIR_AUDIO, DIR_FILES]:
    os.makedirs(d, exist_ok=True)

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
    
    font_cat = ImageFont.truetype(font_path_title, 24)
    font_title = ImageFont.truetype(font_path_title, 32)
    font_body = ImageFont.truetype(font_path_body, 23)
    font_tag = ImageFont.truetype(font_path_body, 20)
    
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
        if len(' '.join(curr)) > 42:
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

def parse_date(date_str):
    if not date_str:
        return None
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

def determine_category(text, tags):
    combined = (text + ' ' + ' '.join(tags)).lower()
    
    if any(k in combined for k in ['تحريف', 'مخطوط', 'نقد نصي', 'مجهول', 'سفر مفقود', 'تناقض', 'اصحاح مضاف', 'فصل مضاف']):
        return 'تحريف الكتاب المقدس والنقد النصي'
    if any(k in combined for k in ['الوهية', 'ألوهية', 'ثالوث', 'ابن الله', 'موت الاله', 'طبيعة المسيح', 'لاهوت', 'ناسوت', 'تجسد']):
        return 'ألوهية المسيح وعقيدة الثالوث'
    if any(k in combined for k in ['صلب', 'الصلب', 'فداء', 'قيامة', 'المزامير تتنبأ', 'مزمور 22', 'صليب', 'فداء']):
        return 'قضية الصلب والفداء والقيامة'
    if any(k in combined for k in ['مرأة', 'مرأه', 'مراة', 'نساء', 'حجاب', 'غطاء', 'ميراث', 'زواج', 'طلاق', 'حواء']):
        return 'المرأة والأسرة في المسيحية'
    if any(k in combined for k in ['قتل', 'جنس', 'عنف', 'دماء', 'ابادة', 'سبي', 'نجس', 'ملعون', 'ارهاب']):
        return 'الأخلاق والتشريعات والعنف'
    if any(k in combined for k in ['عهد قديم', 'توراة', 'موسى', 'داود', 'مزامير', 'مزمور', 'اشعياء', 'ارميا', 'دانيال', 'حزقيال']):
        return 'دراسات العهد القديم والأنبياء'
    if any(k in combined for k in ['عهد جديد', 'انجيل', 'أناجيل', 'بولس', 'متى', 'مرقس', 'لوقا', 'يوحنا', 'رسائل بولس']):
        return 'دراسات العهد الجديد وبولس'
    if any(k in combined for k in ['كنيسة', 'مجمع', 'مجامع', 'شنودة', 'بيشوي', 'ارثوذكس', 'كاثوليك', 'بروتستانت', 'قديس', 'ايقون', 'صليب']):
        return 'العقائد الكنسية والمجامع'
    
    return 'عام ومناظرات نقدية'

def clean_title(full_text, tags, default_id):
    if not full_text or not full_text.strip():
        if tags:
            return f"وثيقة: {' - '.join(tags[:2])}"
        return f"وثيقة مسيحية #{default_id}"

    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    candidate_lines = []
    for line in lines:
        cleaned = re.sub(r'#\w+', '', line).strip()
        cleaned = re.sub(r'^[\s\-•*،:.\(\)\[\]]+', '', cleaned).strip()
        if len(cleaned) >= 5:
            candidate_lines.append(cleaned)
            
    if candidate_lines:
        chosen = candidate_lines[0]
    else:
        chosen = lines[0]

    chosen = re.sub(r'^[\s\-•*،:.\(\)\[\]]+', '', chosen).strip()
    chosen = re.sub(r'#(\w+)', r'\1', chosen).strip()

    if len(chosen) > 95:
        sentences = re.split(r'[.!?؟\n]', chosen)
        if sentences and len(sentences[0].strip()) >= 15:
            chosen = sentences[0].strip()
        else:
            words = chosen[:90].rsplit(' ', 1)[0]
            chosen = words + '...'
            
    return chosen if len(chosen) >= 3 else f"وثيقة #{default_id}"

def run_import():
    print("==========================================================")
    print("🚀 بدء استيراد وتنظيم قناة تيليجرام (المسيحية) إلى المشروع")
    print("==========================================================")
    
    # 1. Copy All Raw Files from Telegram Export
    print("\n[1/4] نسخ ملفات الوسائط إلى مجلد المشروع media/christian/ ...")
    
    # Photos
    src_photos = os.path.join(EXPORT_DIR, 'photos')
    copied_photos = 0
    if os.path.exists(src_photos):
        for f in os.listdir(src_photos):
            s = os.path.join(src_photos, f)
            d = os.path.join(DIR_IMAGES, f)
            if not os.path.exists(d):
                shutil.copy2(s, d)
            copied_photos += 1
    print(f"  ✓ تم نقل {copied_photos} صورة إلى media/christian/images/")

    # Videos
    src_videos = os.path.join(EXPORT_DIR, 'video_files')
    copied_videos = 0
    if os.path.exists(src_videos):
        for f in os.listdir(src_videos):
            s = os.path.join(src_videos, f)
            d = os.path.join(DIR_VIDEOS, f)
            if not os.path.exists(d):
                shutil.copy2(s, d)
            copied_videos += 1
    print(f"  ✓ تم نقل {copied_videos} فيديو إلى media/christian/videos/")

    # Voice / Audio
    src_audio = os.path.join(EXPORT_DIR, 'voice_messages')
    copied_audio = 0
    if os.path.exists(src_audio):
        for f in os.listdir(src_audio):
            s = os.path.join(src_audio, f)
            d = os.path.join(DIR_AUDIO, f)
            if not os.path.exists(d):
                shutil.copy2(s, d)
            copied_audio += 1
    print(f"  ✓ تم نقل {copied_audio} ملف صوتي إلى media/christian/audio/")

    # Files
    src_files = os.path.join(EXPORT_DIR, 'files')
    copied_files = 0
    if os.path.exists(src_files):
        for f in os.listdir(src_files):
            s = os.path.join(src_files, f)
            d = os.path.join(DIR_FILES, f)
            if not os.path.exists(d):
                shutil.copy2(s, d)
            copied_files += 1
    print(f"  ✓ تم نقل {copied_files} مستند إلى media/christian/files/")

    # 2. Parse and Group Messages with 5-Minute Window
    print("\n[2/4] تحليل رسائل القناة ودمج المقالات والصور (ضمن نافذة 5 دقائق)...")
    html_files = sorted(glob.glob(os.path.join(EXPORT_DIR, 'messages*.html')))
    raw_messages = []

    for hf in html_files:
        with open(hf, 'r', encoding='utf-8') as f:
            soup = bs4.BeautifulSoup(f.read(), 'html.parser')
        msgs = soup.find_all('div', class_='message')
        for m in msgs:
            classes = m.get('class', [])
            if 'service' in classes:
                continue
            
            m_id = m.get('id', '')
            text_div = m.find('div', class_='text')
            text = text_div.get_text(separator='\n', strip=True) if text_div else ''
            date_div = m.find('div', class_='date')
            date_str = date_div.get('title', '') if date_div else ''
            dt = parse_date(date_str)
            
            media_wrap = m.find('div', class_='media_wrap')
            photos = []
            videos = []
            audio = []
            files = []
            
            if media_wrap:
                for p in media_wrap.find_all('a', class_='photo_wrap'):
                    href = p.get('href')
                    if href: photos.append(os.path.basename(href))
                for v in media_wrap.find_all('video'):
                    src = v.get('src')
                    if src: videos.append(os.path.basename(src))
                for a in media_wrap.find_all('audio'):
                    src = a.get('src')
                    if src: audio.append(os.path.basename(src))
                for doc in media_wrap.find_all('a', class_='media_file'):
                    href = doc.get('href')
                    if href: files.append(os.path.basename(href))

            raw_messages.append({
                'id': m_id,
                'dt': dt,
                'date_str': date_str,
                'text': text,
                'photos': photos,
                'videos': videos,
                'audio': audio,
                'files': files
            })

    # Grouping logic
    articles = []
    current_art = None

    for msg in raw_messages:
        if current_art is None:
            current_art = {
                'ids': [msg['id']],
                'start_dt': msg['dt'],
                'last_dt': msg['dt'],
                'texts': [msg['text']] if msg['text'] else [],
                'photos': list(msg['photos']),
                'videos': list(msg['videos']),
                'audio': list(msg['audio']),
                'files': list(msg['files'])
            }
            continue
        
        time_diff = None
        if msg['dt'] and current_art['last_dt']:
            time_diff = abs((msg['dt'] - current_art['last_dt']).total_seconds())
        
        should_merge = False
        if time_diff is not None and time_diff <= 300: # 5 minutes window
            if current_art['photos'] and not msg['photos'] and msg['text'] and not current_art['texts']:
                should_merge = True
            elif not current_art['photos'] and msg['photos'] and current_art['texts'] and not msg['text']:
                should_merge = True
            elif current_art['photos'] and msg['photos'] and not msg['text']:
                should_merge = True
            elif time_diff <= 60 and (not current_art['texts'] or not msg['text']):
                should_merge = True

        if should_merge:
            current_art['ids'].append(msg['id'])
            current_art['last_dt'] = msg['dt'] or current_art['last_dt']
            if msg['text']: current_art['texts'].append(msg['text'])
            current_art['photos'].extend(msg['photos'])
            current_art['videos'].extend(msg['videos'])
            current_art['audio'].extend(msg['audio'])
            current_art['files'].extend(msg['files'])
        else:
            articles.append(current_art)
            current_art = {
                'ids': [msg['id']],
                'start_dt': msg['dt'],
                'last_dt': msg['dt'],
                'texts': [msg['text']] if msg['text'] else [],
                'photos': list(msg['photos']),
                'videos': list(msg['videos']),
                'audio': list(msg['audio']),
                'files': list(msg['files'])
            }

    if current_art:
        articles.append(current_art)

    print(f"  ✓ تم تجميع {len(articles)} مقالة وموضوع توثيقي بنجاح.")

    # 3. Connect to Database & Create Folders
    print("\n[3/4] تجهيز الأقسام والتصنيفات في قاعدة البيانات...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Define Categories
    categories = [
        'تحريف الكتاب المقدس والنقد النصي',
        'ألوهية المسيح وعقيدة الثالوث',
        'قضية الصلب والفداء والقيامة',
        'المرأة والأسرة في المسيحية',
        'الأخلاق والتشريعات والعنف',
        'دراسات العهد القديم والأنبياء',
        'دراسات العهد الجديد وبولس',
        'العقائد الكنسية والمجامع',
        'عام ومناظرات نقدية'
    ]

    # Insert Category Folders directly as Roots
    for cat in categories:
        cursor.execute("""
            INSERT INTO folders (path, name, parent_path, sect)
            VALUES (?, ?, NULL, 'نصارى')
            ON CONFLICT(path) DO UPDATE SET name=excluded.name, parent_path=NULL, sect='نصارى'
        """, (cat, cat))
    conn.commit()

    # 4. Insert Articles & Generate Cards for Text-Only Posts
    print("\n[4/4] إدراج المقالات والوسوم وتوليد بطاقات العرض...")
    
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

    inserted_count = 0
    text_cards_created = 0

    for idx, art in enumerate(articles):
        full_text = "\n\n".join(art['texts']).strip()
        tags = extract_hashtags(full_text)
        cat = determine_category(full_text, tags)
        folder_path = cat
        title = clean_title(full_text, tags, art['ids'][0])
        
        main_image_full = None
        main_image_rel = None
        book_source = 'وثائق للمحاورين عن المسيحية'

        if art['photos']:
            # Has photo(s)
            main_photo_name = art['photos'][0]
            main_image_full = os.path.join(DIR_IMAGES, main_photo_name)
            main_image_rel = f"media/christian/images/{main_photo_name}"
            if len(art['photos']) > 1:
                book_source = f"وثائق المسيحية (ألبوم {len(art['photos'])} صور)"
        else:
            # Text Only Article -> generate card
            card_filename = f"text_card_{art['ids'][0]}.jpg"
            card_full = os.path.join(DIR_IMAGES, card_filename)
            create_text_card(title, full_text[:400], cat, tags, card_full)
            text_cards_created += 1
            main_image_full = card_full
            main_image_rel = f"media/christian/images/{card_filename}"
            book_source = "وثائق وبحوث مسيحية"

        file_size = os.path.getsize(main_image_full) if os.path.exists(main_image_full) else 0
        date_created = art['start_dt'].strftime('%Y-%m-%d %H:%M:%S') if art['start_dt'] else datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Insert Document
        cursor.execute(insert_doc_sql, (
            title,
            main_image_rel,
            main_image_full,
            cat,
            folder_path,
            book_source,
            file_size,
            full_text,
            date_created
        ))
        doc_id = cursor.lastrowid or cursor.execute("SELECT id FROM documents WHERE relative_path = ?", (main_image_rel,)).fetchone()[0]

        # Insert Tags
        for t in tags:
            cursor.execute(insert_tag_sql, (doc_id, t))

        inserted_count += 1
        if inserted_count % 150 == 0 or inserted_count == len(articles):
            print(f"  ... تم إدراج {inserted_count} / {len(articles)} مقالة")

    # Update folder file counts
    cursor.execute("""
        UPDATE folders
        SET file_count = (
            SELECT COUNT(*) FROM documents WHERE documents.folder_path = folders.path
        )
    """)
    conn.commit()
    conn.close()

    print("\n==========================================================")
    print(f"🎉 اكتمل الاستيراد بنجاح تام!")
    print(f"• إجمالي المقالات الموثقة: {inserted_count}")
    print(f"• بطاقات المقالات النصية المنشأة: {text_cards_created}")
    print(f"• مسار الحفظ المباشر: {MEDIA_BASE}")
    print("==========================================================")

if __name__ == '__main__':
    run_import()
