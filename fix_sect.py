import sqlite3

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Fix: change sect to نصارى and restore correct path/parent_path
fixes = [
    (1985, 'الجزية في الكتاب المقدس'),
    (1986, 'القتل في الكتاب المقدس'),
    (1987, 'يسوع ليس اله في الكاب المقدس'),
]

for fid, name in fixes:
    parent = 'نصارى'
    path = 'نصارى\\' + name
    cur.execute("""
        UPDATE folders SET sect='نصارى', parent_path=?, path=? WHERE id=?
    """, (parent, path, fid))
    print(f"Fixed id={fid}: sect='نصارى', path='{path}'")

conn.commit()

# Also check: is there a 'نصارى' root folder in sect='نصارى'?
conn.row_factory = sqlite3.Row
cur2 = conn.cursor()
cur2.execute("SELECT id, name, sect FROM folders WHERE name='نصارى'")
rows = cur2.fetchall()
for r in rows:
    print(f"نصارى folder: id={r['id']} sect={r['sect']}")

conn.close()
print("Done!")
