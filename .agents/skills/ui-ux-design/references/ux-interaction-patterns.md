# UX Interaction & Feedback Patterns

A guide to implementing resilient, intuitive, and accessible interaction patterns.

---

## 1. Skeleton Loading States

Always prefer skeleton placeholders over blocking spinners when content shape is predictable.

```html
<div className="animate-pulse space-y-4 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
  <div className="h-6 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
  <div className="space-y-2">
    <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
    <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700"></div>
    <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700"></div>
  </div>
</div>
```

---

## 2. Empty States

Empty states should explain *why* it is empty and provide a clear recovery or action.

```html
<div className="flex flex-col items-center justify-center py-16 text-center px-4">
  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
    <FolderOpenIcon className="h-8 w-8 stroke-1" />
  </div>
  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">لم يتم العثور على نتائج</h3>
  <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
    جرب البحث بكلمات مفتاحية مختلفة أو تأكد من خيارات التصفية المختارة.
  </p>
  <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
    إعادة تعيين البحث
  </button>
</div>
```

---

## 3. Modal / Dialog Ergonomics

- **Overlay**: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity`
- **Container**: `fixed inset-0 z-50 flex items-center justify-center p-4`
- **Dialog Box**: `w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800`
- **Keyboard interaction**:
  - `Escape` key closes the modal.
  - Initial focus traps into first input or primary button.
  - Return focus to the trigger button upon closing.

---

## 4. Toast Notifications

- Position: Bottom-Start or Top-Start in RTL (`bottom-4 start-4`).
- Include distinct status icons (CheckCircle for success, AlertCircle for error, Info for tips).
- Auto-dismiss after 4000ms with a manual dismiss "X" button.
