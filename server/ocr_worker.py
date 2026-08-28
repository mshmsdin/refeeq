import os
import sys
import json
import time
import sqlite3
import argparse
import re
from pathlib import Path
import cv2
import numpy as np

# Ensure UTF-8 output in Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).parent / "db" / "library.db"))

def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn

def cv2_imread_unicode(path):
    try:
        return cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"[Read Error] {e}")
        return None

def fix_arabic_ocr(text):
    if not text:
        return ''
    # PaddleOCR outputs Arabic strings in Left-to-Right byte order.
    has_arabic = bool(re.search(r'[\u0600-\u06FF]', text))
    if has_arabic:
        return text[::-1].strip()
    return text.strip()

def init_ocr_engine():
    try:
        from paddleocr import PaddleOCR
        print("[OCR Engine] Initializing High-Accuracy PaddleOCR (Arabic)...")
        ocr = PaddleOCR(
            use_angle_cls=True, 
            lang='ar', 
            show_log=False,
            det_limit_side_len=2500,
            det_limit_type='max',
            det_db_unclip_ratio=2.0,
            det_db_thresh=0.25,
            det_db_box_thresh=0.4
        )
        print("[OCR Engine] PaddleOCR initialized successfully.")
        return ocr
    except Exception as e:
        print(f"[OCR Engine Error] Failed to initialize PaddleOCR: {e}")
        return None

def process_single_document(ocr, doc_id, full_path):
    if not os.path.exists(full_path):
        print(f"[OCR] File not found: {full_path}")
        conn = get_db_connection()
        conn.execute("UPDATE documents SET ocr_status = 'failed' WHERE id = ?", (doc_id,))
        conn.commit()
        conn.close()
        return False

    try:
        start_time = time.time()
        img = cv2_imread_unicode(full_path)
        if img is None:
            print(f"[OCR] Could not decode image: {full_path}")
            return False

        h, w = img.shape[:2]

        # 1. Scale up small images for fine Arabic character definition
        scale = 1.8 if max(w, h) < 1400 else 1.0
        if scale > 1.0:
            img_proc = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
        else:
            img_proc = img.copy()

        # 2. Adaptive contrast enhancement (removes yellow highlighter & faded scans)
        gray = cv2.cvtColor(img_proc, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

        # 3. Perform OCR on enhanced buffer
        result = ocr.ocr(enhanced_bgr, cls=True)

        raw_items = []
        if result and len(result) > 0 and result[0] is not None:
            for item in result[0]:
                box = item[0]
                raw_text = item[1][0]
                confidence = float(item[1][1])
                clean_text = fix_arabic_ocr(raw_text)

                if not clean_text or len(clean_text.strip()) == 0:
                    continue

                # Map box back to original image coordinates
                orig_box = [[pt[0] / scale, pt[1] / scale] for pt in box]
                y_center = (orig_box[0][1] + orig_box[2][1]) / 2
                x_right = max(orig_box[0][0], orig_box[1][0], orig_box[2][0], orig_box[3][0])
                x_left = min(orig_box[0][0], orig_box[1][0], orig_box[2][0], orig_box[3][0])
                y_top = min(orig_box[0][1], orig_box[1][1], orig_box[2][1], orig_box[3][1])
                y_bottom = max(orig_box[0][1], orig_box[1][1], orig_box[2][1], orig_box[3][1])

                raw_items.append({
                    'text': clean_text,
                    'confidence': confidence,
                    'y': y_center,
                    'x_right': x_right,
                    'x_left': x_left,
                    'y_top': y_top,
                    'y_bottom': y_bottom,
                    'box': orig_box
                })

        # 4. Merge horizontal line fragments into full natural sentences (RTL)
        raw_items.sort(key=lambda item: item['y'])
        merged_lines = []
        current_group = []
        y_threshold = 18.0  # vertical pixel proximity threshold

        for item in raw_items:
            if not current_group:
                current_group.append(item)
            else:
                if abs(item['y'] - current_group[-1]['y']) < y_threshold:
                    current_group.append(item)
                else:
                    # Sort group from Right-to-Left (descending x_right in Arabic)
                    current_group.sort(key=lambda x: -x['x_right'])
                    full_text = " ".join(x['text'] for x in current_group)
                    avg_conf = sum(x['confidence'] for x in current_group) / len(current_group)

                    # Union bounding box
                    u_x1 = min(x['x_left'] for x in current_group)
                    u_y1 = min(x['y_top'] for x in current_group)
                    u_x2 = max(x['x_right'] for x in current_group)
                    u_y2 = max(x['y_bottom'] for x in current_group)
                    union_box = [[u_x1, u_y1], [u_x2, u_y1], [u_x2, u_y2], [u_x1, u_y2]]

                    merged_lines.append({
                        'text': full_text,
                        'confidence': avg_conf,
                        'box': union_box
                    })
                    current_group = [item]

        if current_group:
            current_group.sort(key=lambda x: -x['x_right'])
            full_text = " ".join(x['text'] for x in current_group)
            avg_conf = sum(x['confidence'] for x in current_group) / len(current_group)
            u_x1 = min(x['x_left'] for x in current_group)
            u_y1 = min(x['y_top'] for x in current_group)
            u_x2 = max(x['x_right'] for x in current_group)
            u_y2 = max(x['y_bottom'] for x in current_group)
            union_box = [[u_x1, u_y1], [u_x2, u_y1], [u_x2, u_y2], [u_x1, u_y2]]
            merged_lines.append({
                'text': full_text,
                'confidence': avg_conf,
                'box': union_box
            })

        boxes_data = []
        lines_text = []

        for idx, m in enumerate(merged_lines):
            lines_text.append(m['text'])
            boxes_data.append((doc_id, idx, m['text'], json.dumps(m['box']), m['confidence']))

        full_ocr_text = "\n".join(lines_text)

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM ocr_boxes WHERE document_id = ?", (doc_id,))
        if boxes_data:
            cur.executemany(
                "INSERT INTO ocr_boxes (document_id, line_index, text, box_json, confidence) VALUES (?, ?, ?, ?, ?)",
                boxes_data
            )

        cur.execute(
            "UPDATE documents SET ocr_status = 'completed', ocr_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (full_ocr_text, doc_id)
        )
        conn.commit()
        conn.close()

        elapsed = time.time() - start_time
        print(f"[OCR] Doc #{doc_id} done in {elapsed:.2f}s ({len(lines_text)} merged lines extracted)")
        return True

    except Exception as e:
        print(f"[OCR Error] Failed processing Doc #{doc_id}: {e}")
        conn = get_db_connection()
        conn.execute("UPDATE documents SET ocr_status = 'failed' WHERE id = ?", (doc_id,))
        conn.commit()
        conn.close()
        return False

def run_batch_ocr(limit=100):
    ocr = init_ocr_engine()
    if not ocr:
        print("[OCR] Exiting because OCR engine failed to load.")
        return

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, full_path FROM documents WHERE ocr_status = 'pending' ORDER BY id ASC LIMIT ?",
        (limit,)
    )
    docs = cur.fetchall()
    conn.close()

    total = len(docs)
    print(f"[OCR Batch] Starting batch OCR on {total} documents...")

    for i, doc in enumerate(docs, 1):
        print(f"[{i}/{total}] Processing Doc #{doc['id']}...")
        process_single_document(ocr, doc['id'], doc['full_path'])

    print("[OCR Batch] Batch processing completed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PaddleOCR Worker for Shia Library")
    parser.add_argument("--single-id", type=int, help="Process single document by ID")
    parser.add_argument("--batch-limit", type=int, default=50, help="Batch process N pending documents")
    args = parser.parse_args()

    if args.single_id:
        ocr = init_ocr_engine()
        if ocr:
            conn = get_db_connection()
            doc = conn.execute("SELECT id, full_path FROM documents WHERE id = ?", (args.single_id,)).fetchone()
            conn.close()
            if doc:
                process_single_document(ocr, doc['id'], doc['full_path'])
            else:
                print(f"[OCR Error] Document with id {args.single_id} not found in database.")
    else:
        run_batch_ocr(args.batch_limit)
