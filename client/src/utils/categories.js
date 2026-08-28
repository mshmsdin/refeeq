// Category Definitions & Debate Taxonomy (هجوم • إلزام • دفاع)

export const DEBATE_CATEGORIES = {
  attack: {
    key: 'attack',
    name: 'هجوم',
    label: 'هجوم (ضلالات في كتبهم)',
    description: 'ضلالات وتناقضات ومطاعن في كتبهم لمهاجمتهم وإلزامهم بها في المناظرة',
    color: 'red',
    dotClass: 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0',
    lightClass: 'w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20 shrink-0',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    hoverBorder: 'hover:border-rose-500/40 hover:bg-rose-500/5',
    activeBtn: 'bg-rose-600 text-white shadow-sm font-bold',
    inactiveBtn: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700/70'
  },
  obligation: {
    key: 'obligation',
    name: 'إلزام',
    label: 'إلزام (كلام في كتبهم يوافق ما عندنا)',
    description: 'نصوص واعترافات وأحاديث في كتبهم توافق عقيدتنا وتلزمهم الحجة',
    color: 'amber',
    dotClass: 'w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0',
    lightClass: 'w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20 shrink-0',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    hoverBorder: 'hover:border-amber-500/40 hover:bg-amber-500/5',
    activeBtn: 'bg-amber-500 text-slate-950 shadow-sm font-bold',
    inactiveBtn: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700/70'
  },
  defense: {
    key: 'defense',
    name: 'دفاع',
    label: 'دفاع (ردود على شبهاتهم ضدنا)',
    description: 'ردود وتفنيد للشبهات والإشكالات التي يثيرونها ضد مذهبنا ومصادرنا',
    color: 'emerald',
    dotClass: 'w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0',
    lightClass: 'w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
    activeBtn: 'bg-emerald-600 text-white shadow-sm font-bold',
    inactiveBtn: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700/70'
  }
};
