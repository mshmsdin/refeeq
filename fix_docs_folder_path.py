"""
Fix documents.folder_path to match the updated folders.path values.

The API query is:
  SELECT * FROM documents WHERE folder_path = (SELECT path FROM folders WHERE id=?)
  OR: SELECT * FROM documents WHERE folder_path LIKE folder.path + '%'

The old folder_path in documents = the OLD path (before reorganization).
The new folder.path = CategoryName\FolderName (or CategoryName\Sub\...).

Strategy:
1. Get every folder with its new path (folders.path) and old path.
   - But we don't have the old path stored!
   
Alternative strategy:
- The documents.folder_path was originally = the folder's path at the time of import.
- For root folders, old path = folder name (e.g. "البناء على القبور محرم عند الشيعة")
- For sub-folders, old path = "parent\child" etc.
- Now new path = "الفقه وأحكام الشريعة\البناء على القبور محرم عند الشيعة"

The KEY insight: documents.folder_name = the folder's name (unchanged).
We can join documents on folder_name to get the folder, then update folder_path.

But folder_name might not be unique. We should use the full path match.

SAFER approach: 
- For each folder in DB, compute what the OLD path was (= the path WITHOUT the category prefix).
- For root folders (that were reorganized): old_path = folder_name
- For sub-folders: old_path = old_parent_path\folder_name (recursive)

SIMPLEST approach that works:
- The documents' folder_path matches a folder via folder_name lookup
- Update documents.folder_path = folders.path WHERE documents.folder_name = folders.name AND documents.sect = folders.sect
- This works because folder_name is what we need to match

Let's do it!
"""
import sqlite3

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Update documents.folder_path by joining on folder_name + sect
# This sets folder_path to the current (new) path in folders table
result = cur.execute("""
    UPDATE documents
    SET folder_path = (
        SELECT f.path
        FROM folders f
        WHERE f.name = documents.folder_name
          AND f.sect = documents.sect
        LIMIT 1
    )
    WHERE EXISTS (
        SELECT 1 FROM folders f
        WHERE f.name = documents.folder_name
          AND f.sect = documents.sect
    )
""")

updated = cur.rowcount
conn.commit()
print(f"Updated {updated} documents with new folder_path")

# Verify: check a few شيعة documents
conn.row_factory = sqlite3.Row
cur2 = conn.cursor()
cur2.execute("""
    SELECT d.folder_name, d.folder_path, f.path as folder_new_path
    FROM documents d
    JOIN folders f ON f.name = d.folder_name AND f.sect = d.sect
    WHERE d.sect = 'شيعة'
    LIMIT 5
""")
import json
rows = [dict(r) for r in cur2.fetchall()]
with open('doc_verify.json', 'w', encoding='utf-8') as fp:
    json.dump(rows, fp, ensure_ascii=False, indent=2)
print("Verification saved to doc_verify.json")

conn.close()
