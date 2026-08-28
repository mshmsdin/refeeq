import urllib.request
import json

url = 'http://localhost:3001/api/tree?sect=%D8%B4%D9%8A%D8%B9%D8%A9'
data = json.loads(urllib.request.urlopen(url).read())
tree = data.get('tree', [])

print(f"Root categories: {len(tree)}")
for node in tree:
    children = node.get('children', [])
    print(f"  [{node['file_count']:4d}] {node['name']}  ({len(children)} sub-folders)")
