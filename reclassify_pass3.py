# -*- coding: utf-8 -*-
"""
Pass 3 reclassification: Read folder names from already-created JSON dump,
build a complete classification map, then apply to DB.
Works around Windows terminal encoding issues.
"""
import sqlite3
import json

DB_PATH = 'server/db/library.db'
JSON_PATH = 'folders_dump.json'

# Category definitions: order matters (first match wins)
# Each entry: (category_name, [keywords])
CATEGORIES = [
    ("الإمامة والأئمة", [
        "الإمام", "الامامة", "الامامه", "إلامامه", "الأئمة", "الائمة", "الائمه",
        "اسماء الائمة", "ابناء الامام", "عصمة الأئمة", "علم الأئمة",
        "المهدي", "الغيبة", "الرجعة", "الوصي", "الولاية", "الوصاية",
        "أولي الأمر", "الحجة", "خلافة", "غدير", "الثقلين", "من كنت مولاه",
        "حديث الغدير", "يوم الغدير", "سد الابواب", "فضائل علي",
        "الإمام مشرع", "الامام مشرع", "امامة", "الاثني عشر",
        "الامامه فوق", "مناظرة في الامامه", "الامامة بالشورى",
        "البداء", "اسحاق بن يعقوب", "كفاية الاثر",
        "اسماء الائمة", "فضل علي",
    ]),
    ("الصحابة والخلفاء", [
        "ابو بكر", "أبو بكر", "الصديق في", "عمر بن", "عثمان",
        "ارتداد الصحابة", "الصحابة", "السقيفة", "فدك",
        "معاوية", "يزيد بن", "احراق ابي بكر",
        "اقتلوا سعدا", "اقتلوا نعثلا",
        "استخلف ابن ام مكتوم", "سالم يصلي",
        "ابو ذر", "أبو ذر", "ابو لؤلؤه", "أبو لؤلؤه",
        "اجتماع الامة على معاوية",
        "البخاري والفربري", "الافك",
        "الأسود لا يدخل", "الاسود لا يدخل",
    ]),
    ("القرآن الكريم", [
        "القرآن", "القران", "المصحف", "تحريف", "اوائل السور",
        "اسم علي ليس في القران", "وتقلبك في الساجدين",
        "اعرضوا كلامنا على القران", "الاحرف في اوائل السور",
        "التفسير", "السور", "الآيات", "البعوضه", "آية",
        "تفسير السنة", "تفسير الشيعة",
    ]),
    ("الحديث والرواية", [
        "أخبار الاحاد", "اخبار الاحاد", "احاديث السفياني",
        "احدثنا بعد رسول الله", "ارجعوا الى رواة",
        "اذا حدثتم بحديث", "حجية السنة",
        "تصحيح علماء الرافضة للرواية", "تضعيف علماء الرافضة للرواية",
        "البخاري", "المسند", "صحيح مسلم",
    ]),
    ("العقيدة والتوحيد", [
        "اصول الدين", "العرش", "الكرسي", "الاستواء",
        "اشاعرة", "الأشاعرة", "الاشاعره",
        "الله يتكلم", "اليدين", "الوجه", "العينين", "الاصابع",
        "الغضب والرضى", "القدمين", "الصورة", "المجيء",
        "اصغر من ربي", "التجسيم", "الصفات على الحقيقة",
        "جميع الصفات", "النزول الإلهي",
    ]),
    ("الفقه وأحكام الشريعة", [
        "المتعة", "متعة الحج", "ارضاع الكبير", "الرضاع", "الغلام الايفع",
        "الوجور بمعنى الرضاع", "أولي الاربة",
        "الطهارة", "الوضوء", "الصلاة", "الاذان عند الشيعة",
        "الافطار في رمضان", "الصيام", "المغرب",
        "اكل لحم البشر", "اكل لحوم الحمير", "شرب بول",
        "البول واقفا", "البناء على القبور",
        "التبرك", "التفويض",
        "الارحام المنكوسه",
    ]),
    ("عقائد الشيعة الخاصة", [
        "التقيه", "التقية", "البداء",
        "عند الشيعة", "كتب الشيعة", "علماء الشيعة",
        "اجتهاد علماء الشيعة",
        "ال محمد اتباع محمد", "الشيعة من ال محمد",
        "الاباضية", "اسلام شهربانوا",
        "اسماء تتكلم متعة",
    ]),
    ("التاريخ والسيرة", [
        "ابن سبا", "اسلام شهربانوا ونرجس",
        "ابوي النبي", "أبوي النبي", "ابناء النبي",
        "ابو لؤلؤه المجوسي", "ابو طالب في النار",
        "أبو طالب في النار", "اجتماع الامة",
    ]),
    ("الأنبياء والرسل", [
        "الانبياء", "الأنبياء", "أزر ابو النبي",
        "ابراهيم كذب", "اجساد الانبياء",
        "ابليس اثبت سبابته",
        "اسماء الائمة\\\\", "النبوة",
    ]),
]

# Load the original JSON dump (before any reorganization)
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    all_folders = json.load(f)

# Get only original root folders (parent_path = '' in original dump)
original_roots = [f for f in all_folders if f.get('parent_path', '') == '' and f['sect'] == 'شيعة']
print(f"Original root folders: {len(original_roots)}")

def classify(name):
    for cat_name, keywords in CATEGORIES:
        for kw in keywords:
            if kw in name:
                return cat_name
    return "متنوع"

# Build classification map: original_folder_name -> category
classification = {}
for f in original_roots:
    cat = classify(f['name'])
    classification[f['id']] = cat

# Show summary
from collections import Counter
counts = Counter(classification.values())
print("\nClassification:")
for cat, n in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"  {n:3d}  {cat}")

# Now apply to DB
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get current category folder IDs (these were created in pass 1)
cur.execute("SELECT id, name FROM folders WHERE sect='شيعة' AND (parent_path IS NULL OR parent_path='')")
cat_map = {r['name']: r['id'] for r in cur.fetchall()}
print(f"\nExisting top-level categories: {list(cat_map.keys())}")

# Get all currently existing folders for شيعة
cur.execute("SELECT id, name, path, parent_path FROM folders WHERE sect='شيعة'")
all_current = {r['id']: dict(r) for r in cur.fetchall()}

updated = 0
for orig_folder in original_roots:
    fid = orig_folder['id']
    fname = orig_folder['name']
    fpath = orig_folder['path']
    
    target_cat = classification.get(fid, "متنوع")
    
    # Skip if this folder IS a category itself
    if fname in cat_map:
        continue
    
    # Find the current state of this folder in DB
    if fid not in all_current:
        continue
    
    current = all_current[fid]
    current_parent = current['parent_path']
    current_path = current['path']
    
    # If it's already under the right category, skip
    if current_parent == target_cat:
        continue
    
    # Compute new path
    new_parent = target_cat
    new_path = target_cat + "\\" + fname
    
    # Update this folder
    cur.execute("UPDATE folders SET parent_path=?, path=? WHERE id=?",
                (new_parent, new_path, fid))
    
    # Update all children: replace old path prefix with new path prefix
    old_prefix = current_path
    cur.execute("SELECT id, path, parent_path FROM folders WHERE path LIKE ? AND id!=?",
                (old_prefix + "\\%", fid))
    children = cur.fetchall()
    for child in children:
        new_child_path = new_path + child['path'][len(old_prefix):]
        new_child_parent = child['parent_path']
        if new_child_parent == old_prefix:
            new_child_parent = new_path
        elif new_child_parent.startswith(old_prefix + "\\"):
            new_child_parent = new_path + new_child_parent[len(old_prefix):]
        cur.execute("UPDATE folders SET path=?, parent_path=? WHERE id=?",
                    (new_child_path, new_child_parent, child['id']))
    
    updated += 1

conn.commit()

# Verify final state
cur.execute("SELECT COUNT(*) as c FROM folders WHERE sect='شيعة' AND (parent_path IS NULL OR parent_path='')")
root_count = cur.fetchone()['c']
print(f"\nUpdated: {updated} folders")
print(f"Final root-level folders: {root_count}")

# Show what's still in متنوع
cur.execute("SELECT name FROM folders WHERE sect='شيعة' AND parent_path='متنوع' ORDER BY name")
still = [r['name'] for r in cur.fetchall()]
print(f"Remaining in متنوع: {len(still)}")
for n in still[:20]:
    print(f"  - {n}")

conn.close()
print("\nDone!")
