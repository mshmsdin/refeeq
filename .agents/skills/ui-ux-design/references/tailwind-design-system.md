# Tailwind Design System & Aesthetic Tokens

A curated set of design patterns and utility combinations for ultra-clean, modern UI.

---

## 1. Glassmorphic Surface Tokens

### Header / Navbar
```html
<header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/75 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/75 transition-colors">
  <!-- Content -->
</header>
```

### Cards & Panels
```html
<!-- Primary Card -->
<div className="group relative rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700">
  <!-- Content -->
</div>
```

---

## 2. Button Design Specs

### Primary Button
```html
<button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50">
  <Icon className="w-4 h-4" />
  <span>تأكيد الإجراء</span>
</button>
```

### Secondary / Ghost Button
```html
<button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/70">
  <span>إلغاء</span>
</button>
```

---

## 3. Inputs & Search Fields

```html
<div className="relative">
  <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
  <input
    type="text"
    placeholder="ابحث في آلاف الكتب والمصادر..."
    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 ps-10 pe-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-emerald-400 dark:focus:bg-slate-800"
  />
</div>
```

---

## 4. Badges & Tags

- **Emerald (Success / Verified / Active)**: `bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20`
- **Amber (Highlight / Notice / In Progress)**: `bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20`
- **Slate (Neutral / Counter / Metadata)**: `bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700`
