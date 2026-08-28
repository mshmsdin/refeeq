import sqlite3
import json

conn = sqlite3.connect('server/db/library.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT COUNT(*) as c FROM folders WHERE sect='شيعة' AND (parent_path IS NULL OR parent_path='')")
root = cur.fetchone()['c']

cur.execute("SELECT COUNT(*) as c FROM folders WHERE sect='شيعة'")
total = cur.fetchone()['c']

print(f'Root folders (no parent): {root}')
print(f'Total folders: {total}')

cur.execute("SELECT name, path, file_count FROM folders WHERE sect='شيعة' AND (parent_path IS NULL OR parent_path='') ORDER BY name")
rows = cur.fetchall()
for r in rows:
    print(f"  [{r['file_count']:3d}] {r['name']}")
conn.close()
