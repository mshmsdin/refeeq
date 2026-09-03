import React from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  CircleHelp,
  Copy,
  FileSearch,
  Flame,
  FolderTree,
  Image as ImageIcon,
  Languages,
  Link2,
  ListFilter,
  Menu,
  Moon,
  MonitorPlay,
  MousePointerClick,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Tags,
  TextCursorInput,
  ZoomIn,
} from 'lucide-react';

const features = [
  {
    icon: Search,
    tone: 'amber',
    eyebrow: 'الوصول السريع',
    title: 'ابحث داخل الأرشيف كله',
    description: 'اكتب كلمة أو عبارة في شريط البحث لتصل إلى العناوين، نصوص الوثائق، أسماء المجلدات، الوسوم والمصادر في مكان واحد.',
    tips: ['اضغط على / للانتقال إلى البحث مباشرة', 'استخدم أكثر من كلمة للوصول إلى نتائج أدق'],
  },
  {
    icon: FolderTree,
    tone: 'sky',
    eyebrow: 'ترتيب واضح',
    title: 'تصفح الأقسام والمجلدات',
    description: 'تساعدك شجرة المجلدات الجانبية على الانتقال من الموضوع العام إلى القسم المتخصص، مع إظهار عدد الوثائق في كل مجلد.',
    tips: ['وسّع المجلد أو اطوه بضغطة واحدة', 'استخدم مربع تصفية شجرة المجلدات'],
  },
  {
    icon: ListFilter,
    tone: 'rose',
    eyebrow: 'تصفية ذكية',
    title: 'صنّف النتائج بحسب حاجتك',
    description: 'صفِّ النتائج حسب الفرقة أو المصدر، ثم اختر نوع المادة: هجوم، إلزام أو دفاع. ويمكن إلغاء كل الفلاتر بضغطة واحدة.',
    tips: ['هجوم: تناقضات وضلالات موثقة', 'إلزام: نصوص توافق ما عندنا', 'دفاع: ردود وتفنيد للشبهات'],
  },
  {
    icon: FileSearch,
    tone: 'emerald',
    eyebrow: 'قراءة وتوثيق',
    title: 'افتح الوثيقة في قارئ متكامل',
    description: 'افتح المقال أو الوثيقة المصوّرة في نافذة القراءة، تنقّل بين المواد، كبّر النص والصورة، واحتفظ بالسياق الكامل للمصدر.',
    tips: ['تنقّل إلى الوثيقة السابقة أو التالية', 'انسخ النص أو الصورة للحافظة', 'أضف وسوماً واربط الوثيقة بمجلد'],
  },
  {
    icon: TextCursorInput,
    tone: 'violet',
    eyebrow: 'النصوص المصوّرة',
    title: 'استفد من النص المستخرج آلياً',
    description: 'عند وجود نص مستخرج من صورة، أظهر لوحة النص، حدّد عبارة مهمة، وانسخها أو حوّلها إلى وسم للرجوع إليها لاحقاً.',
    tips: ['أظهر لوحة النص أو أخفها من القارئ', 'حدد عبارة لإضافتها كوسم سريع'],
  },
  {
    icon: Flame,
    tone: 'orange',
    eyebrow: 'المناظرة والبث',
    title: 'جهّز سلة المناظرة والبث',
    description: 'أضف المواد المهمة إلى السلة لتبقى أمامك أثناء النقاش، ثم افتحها مباشرة أو اعرضها في نافذة كبيرة مناسبة للبث.',
    tips: ['أضف أو أزل الوثيقة من زر اللهب', 'افتح المادة في شاشة العرض', 'افرغ السلة عند انتهاء المناظرة'],
  },
  {
    icon: MonitorPlay,
    tone: 'cyan',
    eyebrow: 'عرض احترافي',
    title: 'اعرض الدليل بوضوح',
    description: 'استخدم نافذة العرض الكبيرة لعرض الصورة أو النص أمام المشاهدين، مع أدوات النسخ، ملء الشاشة والإغلاق السريع.',
    tips: ['ملء الشاشة للعرض المباشر', 'نسخ الصورة إلى الحافظة بضغطة واحدة'],
  },
  {
    icon: BookOpen,
    tone: 'blue',
    eyebrow: 'الكتاب المقدس',
    title: 'ابحث في نصوص الكتاب المقدس',
    description: 'انتقل إلى الأسفار والأصحاحات والأعداد، وابحث بكلمة أو بمرجع، واقرأ أكثر من ترجمة مع إمكان المقارنة والنسخ الموثق.',
    tips: ['انتقل إلى سفر أو إصحاح أو عدد مباشرة', 'قارن الترجمات المتاحة', 'انسخ العدد مع توثيقه'],
  },
  {
    icon: BarChart3,
    tone: 'indigo',
    eyebrow: 'نظرة شاملة',
    title: 'راقب إحصائيات الأرشيف',
    description: 'تعرف على إجمالي الوثائق والمجلدات، حالة النصوص المستخرجة، توزيع المواد وأبرز المصادر من نافذة الإحصائيات.',
    tips: ['افتح الإحصائيات من زر الرسم البياني', 'أعد فحص الملفات عند إضافة مواد جديدة'],
  },
  {
    icon: Link2,
    tone: 'teal',
    eyebrow: 'مشاركة دقيقة',
    title: 'شارك الرابط المباشر',
    description: 'كل قسم ووثيقة له رابط يمكن نسخه ومشاركته، ليصل الطرف الآخر إلى المادة نفسها بدلاً من البحث عنها من جديد.',
    tips: ['انسخ رابط المجلد من شريط المسار', 'احتفظ بالرابط في ملاحظاتك أو أرسله للمحاور'],
  },
  {
    icon: Moon,
    tone: 'slate',
    eyebrow: 'راحة الاستخدام',
    title: 'اختر المظهر وطريقة القراءة',
    description: 'بدّل بين المظهر الفاتح والداكن، واضبط حجم الخط داخل القارئ، واستخدم الموقع على الحاسوب أو الهاتف.',
    tips: ['المظهر يحفظ اختياره تلقائياً', 'تكبير وتصغير النص متاحان داخل القارئ'],
  },
];

const toneClasses = {
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-300 border-amber-500/25',
  sky: 'bg-sky-500/12 text-sky-600 dark:text-sky-300 border-sky-500/25',
  rose: 'bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25',
  emerald: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-500/25',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-300 border-violet-500/25',
  orange: 'bg-orange-500/12 text-orange-600 dark:text-orange-300 border-orange-500/25',
  cyan: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-300 border-cyan-500/25',
  blue: 'bg-blue-500/12 text-blue-600 dark:text-blue-300 border-blue-500/25',
  indigo: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 border-indigo-500/25',
  teal: 'bg-teal-500/12 text-teal-600 dark:text-teal-300 border-teal-500/25',
  slate: 'bg-slate-500/12 text-slate-600 dark:text-slate-300 border-slate-500/25',
};

function FeatureCard({ feature, index }) {
  const Icon = feature.icon;

  return (
    <article className="app-card group relative overflow-hidden p-5 sm:p-6 animate-fadeIn" style={{ animationDelay: `${Math.min(index * 45, 450)}ms` }}>
      <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-amber-500/[0.035] blur-2xl transition-transform duration-500 group-hover:scale-150" />
      <div className="relative flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[feature.tone]} transition-transform duration-200 group-hover:-translate-y-1`}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-black tracking-wide text-amber-600 dark:text-amber-400">{feature.eyebrow}</p>
          <h3 className="text-lg font-black leading-relaxed text-slate-900 dark:text-slate-50">{feature.title}</h3>
          <p className="mt-2 text-sm leading-8 text-slate-600 dark:text-slate-300">{feature.description}</p>
        </div>
      </div>
      <ul className="relative mt-4 space-y-2 border-t border-slate-200/70 pt-4 dark:border-slate-700/70">
        {feature.tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
            <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function FeaturesPage({ theme, onToggleTheme, onBack, onOpenBible, totalDocs }) {
  const formattedDocs = totalDocs ? totalDocs.toLocaleString('ar-EG') : 'آلاف';

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      <header className="app-header sticky top-0 z-30 border-b border-slate-200/80 shadow-sm dark:border-slate-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button onClick={onBack} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 focus-ring">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            العودة إلى الأرشيف
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-black text-slate-900 dark:text-slate-50">رفيق المناظر</p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">تعليمات رفيق المناظر</p>
            </div>
            <button onClick={onToggleTheme} className="mr-1 rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-600 transition-colors hover:border-amber-400 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-amber-300 focus-ring" aria-label="تبديل المظهر" title="تبديل المظهر">
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="pointer-events-none absolute -right-28 top-0 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-56 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

        <section className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.14] via-white/80 to-sky-500/[0.08] p-6 shadow-xl shadow-amber-900/[0.04] dark:from-amber-500/[0.16] dark:via-slate-900/90 dark:to-sky-500/[0.08] sm:p-10">
          <div className="absolute -left-10 -top-16 h-48 w-48 rounded-full border border-amber-500/15" />
          <div className="absolute -left-1 top-2 h-40 w-40 rounded-full border border-amber-500/10" />
          <div className="relative max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
              <CircleHelp className="h-4 w-4" />
              تعليمات
            </div>
            <h1 className="text-3xl font-black leading-[1.35] tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              اجعل كل دليل في متناولك،
              <span className="block bg-gradient-to-l from-amber-600 to-orange-500 bg-clip-text text-transparent">وكل مناظرة أكثر ترتيباً</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-8 text-slate-600 dark:text-slate-300 sm:text-base">
              رفيق المناظر أرشيف عملي للبحث في الوثائق والمصادر، قراءتها وتوثيقها، ثم تجهيزها للنقاش أو العرض. هذه الصفحة تلخّص لك الأدوات التي تساعدك من أول بحث إلى آخر دليل.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button onClick={onBack} className="btn-press inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-slate-950/15 transition-colors hover:bg-amber-600 focus-ring dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400">
                <MousePointerClick className="h-4 w-4" />
                ابدأ التصفح الآن
              </button>
              <button onClick={onOpenBible} className="btn-press inline-flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-700 transition-colors hover:bg-blue-500/20 focus-ring dark:text-blue-300">
                <BookOpen className="h-4 w-4" />
                افتح الكتاب المقدس
              </button>
            </div>
          </div>
          <div className="relative mt-8 grid max-w-2xl grid-cols-3 gap-2 border-t border-slate-900/10 pt-5 dark:border-white/10 sm:absolute sm:left-10 sm:top-12 sm:mt-0 sm:w-64 sm:grid-cols-1 sm:gap-4 sm:border-t-0 sm:pt-0">
            <div className="rounded-2xl bg-white/65 p-3 text-center backdrop-blur dark:bg-slate-950/35 sm:text-right">
              <p className="text-xl font-black text-slate-950 dark:text-white">{formattedDocs}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">وثيقة ومصدر</p>
            </div>
            <div className="rounded-2xl bg-white/65 p-3 text-center backdrop-blur dark:bg-slate-950/35 sm:text-right">
              <p className="text-xl font-black text-slate-950 dark:text-white">بحث شامل</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">عنوان ونص ووسم</p>
            </div>
            <div className="rounded-2xl bg-white/65 p-3 text-center backdrop-blur dark:bg-slate-950/35 sm:text-right">
              <p className="text-xl font-black text-slate-950 dark:text-white">جاهز للبث</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">سلة وعرض كبير</p>
            </div>
          </div>
        </section>

        <section className="relative mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black text-amber-600 dark:text-amber-400">دليل الأدوات</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">كل ما تحتاجه في مكان واحد</h2>
            </div>
            <Sparkles className="hidden h-7 w-7 text-amber-500 sm:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => <FeatureCard key={feature.title} feature={feature} index={index} />)}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          <div className="app-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-300"><Search className="h-5 w-5" /></span>
              <h2 className="text-lg font-black">للعثور على دليل</h2>
            </div>
            <p className="text-sm leading-8 text-slate-600 dark:text-slate-300">ابدأ بالبحث، ثم ضيّق النتائج بالقسم أو الصنف أو المجلد. افتح الوثيقة واقرأ النص أو الصورة، ثم انسخ ما تحتاجه.</p>
          </div>
          <div className="app-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/12 text-orange-600 dark:text-orange-300"><Flame className="h-5 w-5" /></span>
              <h2 className="text-lg font-black">للمناظرة والبث</h2>
            </div>
            <p className="text-sm leading-8 text-slate-600 dark:text-slate-300">أضف الأدلة إلى سلة المناظرة، رتّبها أمامك، ثم افتح أي مادة في العرض الكبير لتكون جاهزة للمشاركة مع المشاهدين.</p>
          </div>
          <div className="app-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/12 text-blue-600 dark:text-blue-300"><Languages className="h-5 w-5" /></span>
              <h2 className="text-lg font-black">للبحث المقارن</h2>
            </div>
            <p className="text-sm leading-8 text-slate-600 dark:text-slate-300">استخدم قسم الكتاب المقدس للانتقال إلى المرجع، البحث في الأعداد، مقارنة الترجمات ونسخ النص مع توثيقه.</p>
          </div>
        </section>

        <section className="mt-10 flex flex-col items-center justify-between gap-5 rounded-3xl border border-slate-200 bg-slate-900 p-6 text-center text-white shadow-xl shadow-slate-950/10 dark:border-slate-700 sm:flex-row sm:text-right">
          <div>
            <p className="text-lg font-black">هل أنت جاهز للبدء؟</p>
            <p className="mt-1 text-sm leading-7 text-slate-300">اختر موضوعاً، ابدأ البحث، ودع رفيق المناظر يرتب لك الطريق إلى الدليل.</p>
          </div>
          <button onClick={onBack} className="btn-press inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-black text-slate-950 transition-colors hover:bg-amber-400 focus-ring">
            إلى الأرشيف
            <ChevronLeft className="h-4 w-4" />
          </button>
        </section>
      </main>
    </div>
  );
}
