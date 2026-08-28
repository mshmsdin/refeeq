# Arabic & RTL UI/UX Design Guidelines

Designing for Arabic and Right-to-Left (RTL) contexts requires attention to spatial layout, typography rendering, and visual scanning habits.

---

## 1. Spatial Flow & Mirroring

### Directional Properties
- Always use logical properties instead of hardcoded `left`/`right`:
  - `start` and `end` (e.g. `ms-auto`, `me-4`, `ps-3`, `pe-6` in Tailwind CSS).
  - In CSS: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`.
- Layouts start from the **top-right** and read towards the **bottom-left**:
  - Sidebars: Placed on the **Right**.
  - Action buttons / Close buttons: In modals/dialogs, the close "X" is on the **Left**, modal title is on the **Right**.
  - Back buttons (`<--` becomes `-->` in RTL): Back arrow points **Right** (`fa-arrow-right` or mirrored chevron `transform rtl:rotate-180`).
  - Next/Continue arrows: Point **Left**.

### What NOT to Mirror
- **Media Controls**: Play, Pause, Rewind, Fast-Forward remain standard (Play still points right `▶`).
- **Numbers, Phone Numbers, and Timestamps**: Render Left-to-Right (e.g., `+964 770 123 4567`, `14:30`).
- **Logos / Brand Icons**: Never mirror logos unless specifically designed as RTL variations.
- **Code Snippets / Technical identifiers**: Always `dir="ltr"` and `text-left`.

---

## 2. Arabic Font Pairing & Readability

```html
<!-- Recommended Google Fonts import -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
```

### Font Pairing Rules:
1. **App Interface & Controls**: **Cairo** (Weights: 500 for normal, 600 for buttons/labels, 700 for headings).
2. **Body & Clean Reading**: **Tajawal** (Modern, highly legible at small sizes).
3. **Book Pages / Religious & Academic Texts**: **Amiri** with `text-lg` or `text-xl` and `leading-[2.2]`.

---

## 3. Microcopy & Text Treatment

- Avoid all-caps transformations (`uppercase` does not apply to Arabic and may produce bugs when mixed with English).
- Avoid excessive letter spacing (`tracking-widest` will break Arabic cursive letter connections; use default `tracking-normal`).
- Always support Arabic search with diacritic-insensitivity (Tashkeel stripping: `َ ً ُ ٌ ِ ٍ ْ ّ`) and Alif normalization (`أ إ آ` -> `ا`, `ة` -> `ه`, `ى` -> `ي`).
