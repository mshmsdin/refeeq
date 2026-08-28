import sqlite3, json

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Find these 3 folders and fix their sect
bad_names = [
    'الجزية في الكتاب المقدس',
    'القتل في الكتاب المقدس',
    'يسوع ليس اله في الكاب المقدس',
    'يسوع ليس اله في الكتاب المقدس',
]

for name in bad_names:
    cur.execute("SELECT id, name, sect, path, parent_path FROM folders WHERE name LIKE ?", ('%' + name[:10] + '%',))
    rows = cur.fetchall()
    for r in rows:
        print(dict(r))

conn.close()
