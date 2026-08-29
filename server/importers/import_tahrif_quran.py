import sys
import os
import re
import shutil
import sqlite3
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

EXPORT_DIR = r'C:\Users\mshms\Downloads\Telegram Desktop\ChatExport_2026-08-29'
PROJECT_ROOT = r'e:\المكتبة الشيعية\تطبيق'
MEDIA_DIR = os.path.join(PROJECT_ROOT, 'media', 'شيعة', 'تحريف القرآن')
DB_PATH = os.path.join(PROJECT_ROOT, 'server', 'db', 'library.db')
FOLDER_NAME = 'تحريف القرآن'
SECT = 'شيعة'
SOURCE_NAME = 'ChatExport_2026-08-29'

os.makedirs(MEDIA_DIR, exist_ok=True)

def safe_filename(text: str, max_len: int = 85) -> str:
    if not text:
        text = "بدون_عنوان"
    # Remove emojis or characters forbidden in filenames
    clean = re.sub(r'[\\/:*?"<>|\n\r\t]', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    # Clean leading/trailing punctuation/dots/dashes
    clean = clean.strip('. -_')
    if not clean:
        clean = "بدون_عنوان"
    return clean[:max_len].strip()

def parse_datetime(s: str):
    if not s:
        return None
    m = re.search(r'(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})', s)
    if m:
        try:
            d, mon, y, h, mi, sec = map(int, m.groups())
            return datetime(y, mon, d, h, mi, sec)
        except Exception:
            pass
    return None

def extract_chat_items(export_dir):
    html_path = os.path.join(export_dir, 'messages.html')
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    raw_messages = []
    for div in soup.find_all('div', class_='message'):
        msg_id = div.get('id', '').replace('message', '').strip()
        
        date_el = div.find('div', class_='pull_right') or div.find('div', class_='date')
        date_str = date_el.get('title', '') if date_el and date_el.has_attr('title') else (date_el.text.strip() if date_el else '')
        dt = parse_datetime(date_str)
        
        text_el = div.find('div', class_='text')
        text = text_el.get_text(separator=' ', strip=True) if text_el else ''
        
        reply_el = div.find('div', class_='reply_to')
        reply_to_id = ''
        if reply_el:
            link = reply_el.find('a')
            if link and link.has_attr('href'):
                href = link['href']
                reply_to_id = href.split('message')[-1].replace('#go_to_', '').strip()
                
        photos = []
        for a in div.find_all('a', class_='photo_wrap'):
            href = a.get('href', '')
            if href and href not in photos:
                photos.append(href)
        for img in div.find_all('img'):
            src = img.get('src', '')
            if src and 'photos' in src and not src.endswith('_thumb.jpg') and src not in photos:
                photos.append(src)
                
        for a in div.find_all('a', class_='media_wrap'):
            href = a.get('href', '')
            if href and href not in photos:
                photos.append(href)
                
        raw_messages.append({
            'id': msg_id,
            'date_str': date_str,
            'dt': dt,
            'text': text,
            'reply_to_id': reply_to_id,
            'photos': photos,
        })

    msg_by_id = {m['id']: m for m in raw_messages}
    replies_to_msg = {}
    for m in raw_messages:
        if m['reply_to_id']:
            replies_to_msg.setdefault(m['reply_to_id'], []).append(m)

    all_texts_timeline = [(m['dt'], m['text'], m['id']) for m in raw_messages if m['text'] and m['dt']]

    i = 0
    items = []
    while i < len(raw_messages):
        m = raw_messages[i]
        if not m['photos']:
            i += 1
            continue
        
        album_photos = list(m['photos'])
        album_text = m['text']
        album_dt = m['dt']
        album_id = m['id']
        msg_ids = [m['id']]
        
        j = i + 1
        while j < len(raw_messages):
            nxt = raw_messages[j]
            if not nxt['photos']:
                break
            if nxt['dt'] and m['dt'] and abs((nxt['dt'] - m['dt']).total_seconds()) <= 3:
                for p in nxt['photos']:
                    if p not in album_photos:
                        album_photos.append(p)
                if not album_text and nxt['text']:
                    album_text = nxt['text']
                msg_ids.append(nxt['id'])
                j += 1
            else:
                break
                
        resolved_title = album_text.strip()
        title_source = 'attached' if resolved_title else ''
        
        # 1. Check replies to the photo
        if not resolved_title:
            for mid in msg_ids:
                if mid in replies_to_msg:
                    for rep in replies_to_msg[mid]:
                        if rep['text'].strip():
                            resolved_title = rep['text'].strip()
                            title_source = f'reply_from_{rep["id"]}'
                            break
                if resolved_title:
                    break
                    
        # 2. Check if photo replied to another message
        if not resolved_title:
            for mid in msg_ids:
                cur_m = msg_by_id.get(mid)
                if cur_m and cur_m['reply_to_id']:
                    parent_m = msg_by_id.get(cur_m['reply_to_id'])
                    if parent_m and parent_m['text'].strip():
                        resolved_title = parent_m['text'].strip()
                        title_source = f'replied_to_{parent_m["id"]}'
                        break
                        
        # 3. Check nearest text message in timeline
        if not resolved_title and album_dt:
            nearby = sorted(
                [(abs((dt - album_dt).total_seconds()), txt, mid)
                 for (dt, txt, mid) in all_texts_timeline if dt],
                key=lambda x: x[0]
            )
            if nearby and nearby[0][0] <= 300 and nearby[0][1].strip():
                resolved_title = nearby[0][1].strip()
                title_source = f'nearby_msg_{nearby[0][2]}'

        items.append({
            'item_num': len(items) + 1,
            'id': album_id,
            'msg_ids': msg_ids,
            'dt': album_dt,
            'photos': album_photos,
            'resolved_title': resolved_title or 'تحريف القرآن',
            'title_source': title_source,
        })
        i = j
    return items

def run_import():
    items = extract_chat_items(EXPORT_DIR)
    print(f"Loaded {len(items)} items/albums from export.")
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Ensure folder exists in folders table
    cur.execute("""
        INSERT INTO folders (path, name, parent_path, sect, category, file_count)
        VALUES (?, ?, '', ?, NULL, 0)
        ON CONFLICT(path) DO UPDATE SET
            name = excluded.name,
            sect = excluded.sect
    """, (FOLDER_NAME, FOLDER_NAME, SECT))
    
    conn.commit()
    
    # Get folder id
    cur.execute("SELECT id FROM folders WHERE path = ?", (FOLDER_NAME,))
    folder_row = cur.fetchone()
    folder_id = folder_row[0] if folder_row else None
    print(f"Folder '{FOLDER_NAME}' registered with ID: {folder_id}")
    
    total_inserted = 0
    total_copied = 0
    
    for it in items:
        title = it['resolved_title']
        safe_base = safe_filename(title)
        num_photos = len(it['photos'])
        
        for idx, photo_rel in enumerate(it['photos']):
            src_path = os.path.normpath(os.path.join(EXPORT_DIR, photo_rel))
            if not os.path.exists(src_path):
                print(f"⚠️ Source file not found: {src_path}")
                continue
                
            ext = Path(src_path).suffix or '.jpg'
            if num_photos > 1:
                filename = f"{safe_base}_{idx+1}{ext}"
            else:
                filename = f"{safe_base}{ext}"
                
            dest_path = os.path.join(MEDIA_DIR, filename)
            
            # Handle collision if multiple items produced the same base name
            c_idx = 1
            while os.path.exists(dest_path):
                # Check if it is the same file or different
                if os.path.getsize(dest_path) == os.path.getsize(src_path) and Path(dest_path).name == filename:
                    break
                if num_photos > 1:
                    filename = f"{safe_base}_{it['id']}_{idx+1}_{c_idx}{ext}"
                else:
                    filename = f"{safe_base}_{it['id']}_{c_idx}{ext}"
                dest_path = os.path.join(MEDIA_DIR, filename)
                c_idx += 1
                
            if not os.path.exists(dest_path):
                shutil.copy2(src_path, dest_path)
                total_copied += 1
                
            file_size = os.path.getsize(dest_path)
            rel_path = f"شيعة\\تحريف القرآن\\{filename}"
            
            # Check if record already exists in documents
            cur.execute("SELECT id FROM documents WHERE relative_path = ? OR full_path = ?", (rel_path, dest_path))
            existing = cur.fetchone()
            if existing:
                doc_id = existing[0]
                cur.execute("""
                    UPDATE documents
                    SET filename = ?, folder_name = ?, folder_path = ?, sect = ?, book_source = ?, ocr_text = ?, file_size = ?
                    WHERE id = ?
                """, (filename, FOLDER_NAME, FOLDER_NAME, SECT, SOURCE_NAME, title, file_size, doc_id))
            else:
                cur.execute("""
                    INSERT INTO documents
                    (filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, ocr_status, ocr_text, file_size)
                    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'pending', ?, ?)
                """, (filename, rel_path, dest_path, FOLDER_NAME, FOLDER_NAME, SECT, SOURCE_NAME, title, file_size))
                total_inserted += 1
                
    conn.commit()
    
    # Update folder file_count
    cur.execute("""
        UPDATE folders
        SET file_count = (
            SELECT COUNT(*) FROM documents WHERE documents.folder_path = folders.path
        )
        WHERE path = ?
    """, (FOLDER_NAME,))
    conn.commit()
    
    cur.execute("SELECT file_count FROM folders WHERE path = ?", (FOLDER_NAME,))
    final_count = cur.fetchone()[0]
    print(f"\n✅ Import completed successfully!")
    print(f"   Files Copied: {total_copied}")
    print(f"   Documents Inserted/Updated: {total_inserted}")
    print(f"   Folder '{FOLDER_NAME}' final count in DB: {final_count}")
    
    conn.close()

if __name__ == '__main__':
    run_import()
