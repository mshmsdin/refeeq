import sqlite3, json

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Check full details of these 3 folders
cur.execute("SELECT id, name, sect, path, parent_path FROM folders WHERE id IN (1985, 1986, 1987)")
rows = [dict(r) for r in cur.fetchall()]
with open('bad_folders.json', 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)
print(f"Found {len(rows)} folders")
for r in rows:
    print(f"  id={r['id']} sect='{r['sect']}' parent='{r['parent_path']}' path='{r['path']}'")

# These are Christian folders (نصارى) that somehow got parent_path pointing to a Shia category
# Fix: reset their parent_path to '' so they belong to root of their own sect
for r in rows:
    # Their path should be just their name (strip any Shia category prefix)
    name = r['name']
    # Set parent_path to empty (root level under their own sect)
    cur.execute("UPDATE folders SET parent_path='', path=? WHERE id=?", (name, r['id']))
    print(f"  Fixed id={r['id']}: parent_path='' path='{name}'")

conn.commit()
conn.close()
print("Done!")
