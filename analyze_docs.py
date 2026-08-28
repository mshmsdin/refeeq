"""
Update documents.folder_path to match the new folder paths after reorganization.
Strategy: for each folder in the folders table, update documents that had the OLD path
to now have the NEW path.

We know:
- folders table has: id, name, path (new), parent_path (new), sect
- documents table has: folder_path (old path), folder_name

The documents still have the original folder_path values (before reorganization).
We need to map: old_folder_path -> new_folder_path for each folder.

The old folder_path was the folder's original path (= folder name for root folders).
The new folder_path is now: category\folder_name

We'll join documents.folder_path with the original folder names to find matches,
then update to the new path.
"""
import sqlite3, json

DB_PATH = 'server/db/library.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get all folders with their CURRENT path (new) and name
# The folder_name in documents = the folder's name field
# We need to find: for each folder, what documents reference it via folder_name
# Then set documents.folder_path = folder.path (the new path)

cur.execute("SELECT id, name, path, parent_path, sect FROM folders WHERE sect='شيعة'")
all_folders = [dict(r) for r in cur.fetchall()]

# Build a map: folder_name -> new_path (for Shia folders only)
# Note: multiple folders can have the same name (unlikely but possible)
name_to_path = {}
for f in all_folders:
    name_to_path[f['name']] = f['path']

print(f"Loaded {len(name_to_path)} Shia folder name->path mappings")

# Check current state: how many docs have folder_path matching a category name (old flat path)?
# Documents with folder_path = folder_name (old root folders) need updating
# Documents with folder_path already containing '\' might be ok or might need updating too

cur.execute("SELECT DISTINCT folder_path, folder_name FROM documents WHERE sect='شيعة' LIMIT 20")
samples = [dict(r) for r in cur.fetchall()]
print("\nSample current folder_path values in documents:")
for s in samples:
    print(f"  folder_path='{s['folder_path']}' folder_name='{s['folder_name']}'")

conn.close()
