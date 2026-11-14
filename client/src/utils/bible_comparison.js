export function orderVerseResults(results, selectedTranslations) {
  return selectedTranslations.map(slug => (results || []).find(result => result.translation_slug === slug)).filter(Boolean);
}
