import sqlite3, json

DB_PATH = 'server/db/library.db'

CATEGORY_NAMES = [
    "الأنبياء والرسل", "الإمامة والأئمة", "التاريخ والسيرة",
    "الحديث والرواية", "الرد والمناظرة", "الصحابة والخلفاء",
    "العقيدة والتوحيد", "الفقه وأحكام الشريعة", "القرآن الكريم",
    "عقائد الشيعة الخاصة", "متنوع"
]

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Find root folders that are NOT a category name
placeholders = ','.join(['?' for _ in CATEGORY_NAMES])
cur.execute(f"""
    SELECT id, name, path, parent_path FROM folders
    WHERE sect='شيعة'
    AND (parent_path IS NULL OR parent_path='')
    AND name NOT IN ({placeholders})
""", CATEGORY_NAMES)
orphans = [dict(r) for r in cur.fetchall()]

with open('orphans.json', 'w', encoding='utf-8') as f:
    json.dump(orphans, f, ensure_ascii=False, indent=2)

print(f"Orphan root folders: {len(orphans)}")
for o in orphans:
    print(f"  [{o['id']}] {o['name']}")

# Move them to متنوع
for o in orphans:
    new_path = "متنوع\\" + o['name']
    cur.execute("UPDATE folders SET parent_path='متنوع', path=? WHERE id=?",
                (new_path, o['id']))
    # Update children
    old_prefix = o['path']
    cur.execute("SELECT id, path, parent_path FROM folders WHERE path LIKE ? AND id!=?",
                (old_prefix + "\\%", o['id']))
    for child in cur.fetchall():
        new_child_path = new_path + child['path'][len(old_prefix):]
        new_child_parent = child['parent_path']
        if new_child_parent == old_prefix:
            new_child_parent = new_path
        elif new_child_parent.startswith(old_prefix + "\\"):
            new_child_parent = new_path + new_child_parent[len(old_prefix):]
        cur.execute("UPDATE folders SET path=?, parent_path=? WHERE id=?",
                    (new_child_path, new_child_parent, child['id']))

conn.commit()
conn.close()
print("Done!")
