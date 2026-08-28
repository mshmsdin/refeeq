import React from 'react';
import { X, Sparkles, Swords, Scale, ShieldCheck } from 'lucide-react';
import { DEBATE_CATEGORIES } from '../utils/categories';

export default function CategoryGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                دليل أصناف المناظرة
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/25">
                  منهجية التصنيف
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تنظيم الوثائق والمصادر إلى (هجوم • إلزام • دفاع)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Categories Showcase */}
        <div className="space-y-3">
          
          {/* 1. الهجوم (Rose/Red) */}
          <div className="p-4 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={DEBATE_CATEGORIES.attack.dotClass} />
                <h4 className="font-bold text-xs sm:text-sm text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <Swords className="w-4 h-4" />
                  صنف الهجوم (أحمر 🔴)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                ضلالات وتناقضات في كتبهم
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              يُخصص للوثائق التي تحتوي على <strong>ضلالات، تناقضات، أو تحريفات موثقة في كتب المخالفين</strong>، لاستخدامها في إبطال دعاويهم ومهاجمتها وإلجائهم للاعتراف بفساد أصلهم.
            </p>
          </div>

          {/* 2. الإلزام (Amber) */}
          <div className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={DEBATE_CATEGORIES.obligation.dotClass} />
                <h4 className="font-bold text-xs sm:text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  صنف الإلزام (أصفر / ذهبي 🟡)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                كلام في كتبهم يوافق ما عندنا
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              يُخصص للنصوص والأحاديث والاعترافات في <strong>كتب الخصم التي توافق عقيدتنا ورواياتنا</strong>، فتكون حجة قاطعة ومُلزمة لهم وفق قاعدة <em>"ألزموهم بما ألزموا به أنفسهم"</em>.
            </p>
          </div>

          {/* 3. الدفاع (Emerald) */}
          <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={DEBATE_CATEGORIES.defense.dotClass} />
                <h4 className="font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  صنف الدفاع (أخضر 🟢)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                ردود وتفنيد للشبهات ضدنا
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              يُخصص للوثائق والأدلة التي <strong>تفنّد الشبهات والمفتريات</strong> التي يثيرها الخصوم ضد مذهبنا، مع شروحات علمية وتحقيقات تدحض دعاواهم بالأسانيد والأدلة المحكمة.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
