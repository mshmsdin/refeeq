const APOCRYPHA_COLLECTIONS = ['deuterocanon', 'apocrypha', 'pseudepigrapha'];

export function expandBibleSearchCollections(collectionSlugs = []) {
  const expanded = new Set(collectionSlugs);
  if (expanded.has('apocrypha')) {
    for (const slug of APOCRYPHA_COLLECTIONS) expanded.add(slug);
  }
  return [...expanded];
}
