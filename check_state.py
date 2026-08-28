# -*- coding: utf-8 -*-
"""
Show current DB state and what's under متنوع - read and write UTF8 json
"""
import sqlite3, json

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Root categories
cur.execute("SELECT id, name, (SELECT COUNT(*) FROM folders f2 WHERE f2.parent_path=f1.name AND f2.sect='شيعة') as child_count FROM folders f1 WHERE sect='شيعة' AND (parent_path IS NULL OR parent_path='') ORDER BY name")
roots = [dict(r) for r in cur.fetchall()]

# متنوع children
cur.execute("SELECT id, name, file_count FROM folders WHERE sect='شيعة' AND parent_path='متنوع' ORDER BY name")
misc = [dict(r) for r in cur.fetchall()]

output = {
    "roots": roots,
    "متنوع_count": len(misc),
    "متنوع_children": misc
}

with open('current_state.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Root categories: {len(roots)}")
print(f"Folders in متنوع: {len(misc)}")
conn.close()
