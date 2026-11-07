export function selectSources(sources, slug) {
  if (!slug) return sources;
  const selected = sources.filter((source) => source.slug === slug);
  if (!selected.length) throw new Error(`مصدر غير معروف: ${slug}`);
  return selected;
}

export function selectBooks(books, code) {
  if (!code) return books;
  const normalizedCode = code.toUpperCase();
  const selected = books.filter((book) => book.code === normalizedCode || book.bookCode === normalizedCode);
  if (!selected.length) throw new Error(`سفر غير معروف: ${code}`);
  return selected;
}
