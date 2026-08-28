import urllib.request, json

# Test: fetch docs from "البناء على القبور محرم عند الشيعة" which was under الفقه
url = 'http://localhost:3001/api/documents?page=1&limit=5&q=&filter=all&sect=%D8%B4%D9%8A%D8%B9%D8%A9&folder=%D8%A7%D9%84%D9%81%D9%82%D9%87%20%D9%88%D8%A3%D8%AD%D9%83%D8%A7%D9%85%20%D8%A7%D9%84%D8%B4%D8%B1%D9%8A%D8%B9%D8%A9%5C%D8%A7%D9%84%D8%A8%D9%86%D8%A7%D8%A1%20%D8%B9%D9%84%D9%89%20%D8%A7%D9%84%D9%82%D8%A8%D9%88%D8%B1%20%D9%85%D8%AD%D8%B1%D9%85%20%D8%B9%D9%86%D8%AF%20%D8%A7%D9%84%D8%B4%D9%8A%D8%B9%D8%A9'
try:
    data = json.loads(urllib.request.urlopen(url, timeout=5).read())
    total = data.get('total', 0)
    docs = data.get('documents', [])
    print(f"Total docs: {total}, fetched: {len(docs)}")
    for d in docs:
        print(f"  {d.get('filename')} | folder_path={d.get('folder_path')}")
except Exception as e:
    print(f"Error: {e}")

# Also test root level شيعة
url2 = 'http://localhost:3001/api/documents?page=1&limit=5&q=&filter=all&sect=%D8%B4%D9%8A%D8%B9%D8%A9'
try:
    data2 = json.loads(urllib.request.urlopen(url2, timeout=5).read())
    print(f"\nRoot شيعة total: {data2.get('total',0)}")
except Exception as e:
    print(f"Error2: {e}")
