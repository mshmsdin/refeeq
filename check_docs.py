import sqlite3, json

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Check documents table structure
cur.execute("PRAGMA table_info(documents)")
cols = [dict(r) for r in cur.fetchall()]
print("Documents columns:", [c['name'] for c in cols])

# Sample a few documents
cur.execute("SELECT * FROM documents LIMIT 3")
rows = [dict(r) for r in cur.fetchall()]
with open('doc_sample.json', 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)
print("Sample saved to doc_sample.json")

# Count total documents
cur.execute("SELECT COUNT(*) as c FROM documents")
print(f"Total documents: {cur.fetchone()['c']}")

conn.close()
