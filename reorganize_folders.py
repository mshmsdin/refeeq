"""
Smart folder reorganization for "شيعة" sect.
Creates logical top-level categories and moves existing root folders under them.
ONLY touches root folders (parent_path = ''), never touches sub-folders.
Does NOT delete any folders or documents.
"""
import sqlite3
import json

DB_PATH = 'server/db/library.db'

# =============================================================================
# 1. Define the new top-level categories
# =============================================================================
# Each category has an icon emoji for display and a list of keyword patterns.
# The order matters: first match wins.

CATEGORIES = [
    {
        "name": "الإمامة والأئمة",
        "icon": "👑",
        "keywords": [
            "الإمام", "الامام", "الأئمة", "الائمة", "اسماء الائمة", "ابناء الامام",
            "عصمة الائمة", "علم الأئمة", "المهدي", "الغيبة", "الرجعة",
            "اسحاق بن يعقوب", "كفاية الاثر", "الولاية", "أولي الأمر",
            "الحسن والحسين", "خلافة علي", "الوصاية", "النص على علي",
            "امامة الائمة", "الوصي", "الحجة"
        ]
    },
    {
        "name": "الصحابة والخلفاء",
        "icon": "⚖️",
        "keywords": [
            "ابو بكر", "أبو بكر", "عمر بن", "عثمان", "ارتداد الصحابة",
            "الصحابة", "الخليفة", "الخلافة", "سقيفة", "فدك", "معاوية",
            "اجتماع الامة على معاوية", "ابو طالب", "أبو طالب",
            "احراق ابي بكر", "اقتلوا نعثلا", "اقتلوا سعدا",
            "استخلف ابن ام مكتوم", "سالم يصلي", "الصاحب مؤمن",
            "ابو ذر", "أبو ذر", "ابو لؤلؤه", "أبو لؤلؤه",
            "ابناء الامام علي", "ابناء النبي", "أبوي النبي"
        ]
    },
    {
        "name": "القرآن الكريم",
        "icon": "📖",
        "keywords": [
            "القرآن", "القران", "تحريف القرآن", "تفسير", "الاحرف في اوائل السور",
            "اسم علي ليس في القران", "الصاحب مؤمن في القران",
            "اعرضوا كلامنا على القران", "وتقلبك في الساجدين", "المصحف",
            "مصحف", "آية", "الايات", "الآيات", "سورة"
        ]
    },
    {
        "name": "الحديث والرواية",
        "icon": "📜",
        "keywords": [
            "الحديث", "رواية", "رواياة", "اخبار الاحاد", "أخبار الاحاد",
            "احاديث السفياني", "احدثنا بعد رسول الله", "ارجعوا الى رواة",
            "اذا حدثتم بحديث", "الكافي", "حجية السنة", "السنة النبوية",
            "تصحيح علماء الرافضة", "تضعيف علماء الرافضة",
            "رواة", "مسند", "صحيح", "ضعيف", "موثق", "مروي"
        ]
    },
    {
        "name": "العقيدة والتوحيد",
        "icon": "🕌",
        "keywords": [
            "العقيدة", "التوحيد", "اصول الدين", "العرش", "الكرسي",
            "اشاعرة", "الاستواء", "الصفات", "الله يتكلم", "النزول",
            "المجيء", "اليدين", "الوجه", "العينين", "الاصابع",
            "الغضب والرضى", "القدمين", "الصورة", "الاسماء والصفات",
            "الرؤية", "التجسيم", "التعطيل", "اصغر من ربي"
        ]
    },
    {
        "name": "الفقه وأحكام الشريعة",
        "icon": "⚖️",
        "keywords": [
            "المتعة", "متعة الحج", "متعة النساء", "الطلاق", "الزواج",
            "ارضاع الكبير", "أرضاع الكبير", "الرضاع", "رضاع", "أولي الاربة",
            "التقية", "الاحكام", "الفقه", "الحلال", "الحرام",
            "الزكاة", "الصلاة", "الاذان", "الصيام", "الحج",
            "اكل لحم البشر", "اكل لحوم الحمير", "شرب بول",
            "الفطرة", "المطاهرة", "المسح", "الوضوء"
        ]
    },
    {
        "name": "التاريخ والسيرة",
        "icon": "🏛️",
        "keywords": [
            "التاريخ", "السيرة", "ابن سبا", "أبو لؤلؤه", "الفتنة",
            "كربلاء", "عاشوراء", "الحسين", "واقعة", "غزوة",
            "اسلام شهربانوا ونرجس", "أبوي النبي", "ابناء النبي",
            "أزر ابو النبي", "ابراهيم كذب", "اجساد الانبياء",
            "الانبياء", "الصحابة في التاريخ", "أبو ذر مسلم على جهل"
        ]
    },
    {
        "name": "الأنبياء والرسل",
        "icon": "🌟",
        "keywords": [
            "النبي ابراهيم", "ابراهيم", "أزر ابو", "الانبياء", "الأنبياء",
            "اجساد الانبياء", "عصمة الانبياء", "الانبياء من ذرية",
            "ابليس اثبت سبابته", "اصغر من ربي",
            "معصوم", "النبوة", "الوحي"
        ]
    },
    {
        "name": "عقائد الشيعة الخاصة",
        "icon": "🔬",
        "keywords": [
            "البداء", "الرجعة", "التقية", "ارضاع الكبير عند الشيعة",
            "الغلام الايفع", "اكل لحم البشر", "اجتهاد علماء الشيعة",
            "ال محمد اتباع محمد", "الشيعة من ال محمد",
            "الأسود لا يدخل الجنه", "الأسود لا يدخل",
            "اسلام شهربانوا", "اسماء تتكلم متعة",
            "الاباضية", "عقائد الشيعة", "عقيدة الشيعة"
        ]
    },
    {
        "name": "الرد والمناظرة",
        "icon": "🗡️",
        "keywords": [
            "الرد على", "رد على", "المناظرة", "الحجة على", "شبهة",
            "دفاع", "الجواب", "الاشكال", "التناقض", "الكذب",
            "الرافضة", "الرد"
        ]
    }
]

# =============================================================================
# 2. Load all root folders from DB
# =============================================================================
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("""
    SELECT id, name, path, parent_path, sect
    FROM folders
    WHERE sect = 'شيعة' AND (parent_path IS NULL OR parent_path = '')
    ORDER BY name
""")
root_folders = [dict(r) for r in cur.fetchall()]
print(f"Found {len(root_folders)} root folders to classify")

# =============================================================================
# 3. Build classification map
# =============================================================================
def classify_folder(name):
    """Return category name that best matches folder name."""
    name_lower = name.lower()
    for cat in CATEGORIES:
        for kw in cat["keywords"]:
            if kw in name or kw.lower() in name_lower:
                return cat["name"]
    return "متنوع"  # fallback

# Track assignments
assignments = {}
unclassified = []

for folder in root_folders:
    cat = classify_folder(folder["name"])
    assignments[folder["id"]] = {
        "folder": folder,
        "category": cat
    }
    if cat == "متنوع":
        unclassified.append(folder["name"])

# =============================================================================
# 4. Show summary before applying
# =============================================================================
cat_counts = {}
for a in assignments.values():
    c = a["category"]
    cat_counts[c] = cat_counts.get(c, 0) + 1

print("\n=== Classification Summary ===")
for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
    print(f"  {count:3d}  {cat}")

print(f"\nUnclassified ({len(unclassified)}):")
for name in sorted(unclassified)[:30]:
    print(f"  - {name}")

# =============================================================================
# 5. Apply changes to DB
# =============================================================================
print("\nApplying changes to DB...")

# Step A: Create category folders if they don't exist
cat_folder_ids = {}
for cat_info in CATEGORIES:
    cat_name = cat_info["name"]
    cur.execute("""
        SELECT id FROM folders WHERE name = ? AND sect = 'شيعة' AND (parent_path IS NULL OR parent_path = '')
    """, (cat_name,))
    row = cur.fetchone()
    if row:
        cat_folder_ids[cat_name] = row["id"]
        print(f"  Category exists: {cat_name} (id={row['id']})")
    else:
        cur.execute("""
            INSERT INTO folders (name, path, parent_path, sect, file_count, category)
            VALUES (?, ?, '', 'شيعة', 0, NULL)
        """, (cat_name, cat_name))
        cat_folder_ids[cat_name] = cur.lastrowid
        print(f"  Created category: {cat_name} (id={cur.lastrowid})")

# Also create "متنوع" category
if unclassified:
    cur.execute("""
        SELECT id FROM folders WHERE name = 'متنوع' AND sect = 'شيعة' AND (parent_path IS NULL OR parent_path = '')
    """)
    row = cur.fetchone()
    if row:
        cat_folder_ids["متنوع"] = row["id"]
    else:
        cur.execute("""
            INSERT INTO folders (name, path, parent_path, sect, file_count, category)
            VALUES ('متنوع', 'متنوع', '', 'شيعة', 0, NULL)
        """)
        cat_folder_ids["متنوع"] = cur.lastrowid
        print(f"  Created category: متنوع (id={cur.lastrowid})")

conn.commit()

# Step B: For each root folder, update parent_path to point to its category
updated = 0
for folder_id, info in assignments.items():
    folder = info["folder"]
    cat_name = info["category"]
    new_parent = cat_name
    new_path = cat_name + "\\" + folder["name"]

    # Skip if already under a category (shouldn't happen for root folders)
    if folder["path"] in [c["name"] for c in CATEGORIES] or folder["name"] in cat_folder_ids:
        continue
    
    # Update the folder itself
    cur.execute("""
        UPDATE folders SET parent_path = ?, path = ? WHERE id = ?
    """, (new_parent, new_path, folder_id))
    
    # Update all child folders whose path starts with the old root path
    old_path_prefix = folder["path"]
    cur.execute("""
        SELECT id, path, parent_path FROM folders
        WHERE path LIKE ? AND id != ?
    """, (old_path_prefix + "\\%", folder_id))
    children = cur.fetchall()
    
    for child in children:
        old_child_path = child["path"]
        new_child_path = new_path + old_child_path[len(old_path_prefix):]
        
        old_child_parent = child["parent_path"]
        if old_child_parent == old_path_prefix:
            new_child_parent = new_path
        else:
            new_child_parent = new_path + old_child_parent[len(old_path_prefix):]
        
        cur.execute("""
            UPDATE folders SET path = ?, parent_path = ? WHERE id = ?
        """, (new_child_path, new_child_parent, child["id"]))
    
    updated += 1

conn.commit()
print(f"\nUpdated {updated} root folders with new parent categories.")

# Verify
cur.execute("SELECT COUNT(*) as c FROM folders WHERE sect = 'شيعة' AND (parent_path IS NULL OR parent_path = '')")
new_root_count = cur.fetchone()["c"]
print(f"New root folder count: {new_root_count} (should equal number of categories)")

conn.close()
print("\nDone! ✓")
