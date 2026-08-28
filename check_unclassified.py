"""
Show what's in 'متنوع' to refine classification.
"""
import sqlite3

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get all folders now under 'متنوع'
cur.execute("""
    SELECT id, name, file_count FROM folders
    WHERE sect = 'شيعة' AND parent_path = 'متنوع'
    ORDER BY name
""")
rows = cur.fetchall()
print(f"Folders under 'متنوع': {len(rows)}")
for r in rows:
    print(f"  [{r['file_count']:3d}] {r['name']}")

# Also show current root category distribution
print("\n=== Current root-level folders ===")
cur.execute("""
    SELECT name, file_count FROM folders
    WHERE sect = 'شيعة' AND (parent_path IS NULL OR parent_path = '')
    ORDER BY name
""")
for r in cur.fetchall():
    print(f"  {r['name']}")

conn.close()
