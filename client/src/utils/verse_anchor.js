// رابط الإصحاح مع رقم عدد بعد #، مثل /bible/2ES/14#21: يفتح الإصحاح ويمرّر إلى العدد ويُبرزه.

// يقبل #21 و#v21 و#verse-21 (بأي حالة أحرف) ويرجع رقم العدد، أو null إن لم يكن الجزء رقم عدد صالحاً.
export function parseVerseHash(hash) {
  const match = /^#(?:v|verse-?)?(\d{1,3})$/i.exec(String(hash || '').trim());
  if (!match) return null;
  const verse = Number.parseInt(match[1], 10);
  return verse >= 1 ? verse : null;
}
