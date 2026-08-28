---
name: ui-ux-design
description: >-
  Use this skill whenever designing, reviewing, improving, or implementing UI/UX components, web pages, responsive layouts, design systems, color palettes, animations, and typography for modern Arabic and English web apps (especially React, Tailwind CSS, Vite, and modern CSS).
---

# UI/UX Design & Frontend Aesthetic Guidelines

This skill guides the creation of world-class, premium, modern user interfaces with a focus on Arabic typography, RTL layout ergonomics, intuitive UX patterns, and polished micro-interactions.

---

## Core Philosophy

1. **Visual Excellence ("Wow" Factor)**: Avoid generic or dull designs. Use refined color palettes, subtle glassmorphism, depth through layered soft shadows, modern border radii, and fluid animations.
2. **First-Class Arabic / RTL Support**: Proper alignment, Arabic font hierarchy (e.g. *Cairo*, *Tajawal*, *Amiri*), appropriate line-heights, and mirrored UI interactions (icons, navigation, drawers).
3. **Intentional UX & State Feedback**: Every interactive element must provide immediate, delightful visual feedback (hover, focus-visible, active, disabled, loading skeletons, empty states).
4. **Consistency through Design Tokens**: Establish clear color scales, typography scales, spacing units, and radius tokens.

---

## 1. Typography & Hierarchy

### Arabic Font Stacks & Use-Cases
- **Modern UI & Dashboards**: `font-sans` with `Cairo` or `Tajawal` or `Alexandria` (clear legibility at small sizes).
- **Reading & Literary / Islamic Content**: `font-serif` with `Amiri` or `Traditional Arabic` or `Scheherazade New` (exceptional line flow, generous `leading-loose` / `line-height: 1.8 - 2.2`).

### Typography Rules
- **Line Heights**: Arabic text requires **20-30% more line height** than English text to prevent diacritics and ligatures from clipping (`leading-relaxed` or `leading-loose`).
- **Scale Hierarchy**:
  - `h1`: Page Hero Title (`text-3xl` to `text-5xl font-bold tracking-tight`)
  - `h2`: Section Header (`text-2xl` to `text-3xl font-semibold`)
  - `h3`: Card / Widget Title (`text-lg` to `text-xl font-medium`)
  - Body: (`text-base` or `text-sm text-slate-600 dark:text-slate-300 leading-relaxed`)
  - Caption / Metadata: (`text-xs text-slate-400 font-normal`)

---

## 2. Color Palette & Dark Mode

### Primary & Accent Guidelines
- Avoid pure blacks (`#000000`) and pure whites (`#ffffff` for large dark backgrounds).
- **Dark Mode Backgrounds**: Slate / Zinc palette (`bg-slate-900`, `bg-slate-950`, surfaces: `bg-slate-800/80 backdrop-blur-md`).
- **Accent Colors**:
  - Emerald / Teal (Serene, trust, Islamic/heritage vibe): `#059669`, `#0d9488`
  - Indigo / Violet (Modern, tech, luxury): `#6366f1`, `#8b5cf6`
  - Amber / Gold (Rich accent, highlighting, bookmarks): `#d97706`, `#f59e0b`
  - Crimson / Rose (Destructive, errors, heart/favorites): `#e11d48`, `#ef4444`

---

## 3. Elevation, Glassmorphism & Depth

- **Cards**:
  - Light mode: `bg-white/90 border border-slate-200/80 shadow-sm hover:shadow-md transition-all`
  - Dark mode: `bg-slate-800/60 backdrop-blur-md border border-slate-700/60 shadow-lg shadow-black/20`
- **Gradients**:
  - Subtle background glows: `bg-gradient-to-tr from-emerald-500/10 via-transparent to-teal-500/10`
  - Accent text gradient: `bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500`

---

## 4. Interaction & Motion Rules

- **Transitions**: Use standardized timings:
  - Fast (buttons, hovers): `transition-all duration-150 ease-out`
  - Medium (dropdowns, cards, modals): `transition-all duration-250 ease-in-out`
  - Transform hovers: `hover:-translate-y-0.5 active:translate-y-0 active:scale-98`
- **Focus Rings**: Always ensure accessible keyboard navigation:
  - `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`
- **Feedback & Feedback States**:
  - Skeleton screens during data loading (`animate-pulse bg-slate-200 dark:bg-slate-700 rounded`)
  - Friendly empty states with an illustration/icon + clear call-to-action button.

---

## 5. Detailed References

For specialized deep dives, consult:
- [Arabic RTL Guidelines](./references/arabic-rtl-guidelines.md)
- [Tailwind Design System Tokens](./references/tailwind-design-system.md)
- [UX Interaction & Component Patterns](./references/ux-interaction-patterns.md)
