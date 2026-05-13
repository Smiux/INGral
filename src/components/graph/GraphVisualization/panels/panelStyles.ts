type HoverColorType =
  | 'sky' | 'blue' | 'cyan' | 'indigo'
  | 'green' | 'emerald' | 'teal' | 'lime';

interface HoverColorClasses {
  border: string;
  bg: string;
  text: string;
  ring: string;
  icon: string;
  buttonBg: string;
  buttonBgHover: string;
  buttonRing: string;
}

const hoverColorConfig: Record<HoverColorType, HoverColorClasses> = {
  'sky': {
    'border': 'hover:border-sky-400 dark:hover:border-sky-500',
    'bg': 'hover:bg-sky-100/80 dark:hover:bg-sky-900/30',
    'text': 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
    'ring': 'focus:ring-sky-500',
    'icon': 'text-sky-400',
    'buttonBg': 'bg-sky-500',
    'buttonBgHover': 'hover:bg-sky-600',
    'buttonRing': 'focus:ring-sky-400'
  },
  'blue': {
    'border': 'hover:border-blue-400 dark:hover:border-blue-500',
    'bg': 'hover:bg-blue-100/80 dark:hover:bg-blue-900/30',
    'text': 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    'ring': 'focus:ring-blue-500',
    'icon': 'text-blue-400',
    'buttonBg': 'bg-blue-500',
    'buttonBgHover': 'hover:bg-blue-600',
    'buttonRing': 'focus:ring-blue-400'
  },
  'cyan': {
    'border': 'hover:border-cyan-400 dark:hover:border-cyan-500',
    'bg': 'hover:bg-cyan-100/80 dark:hover:bg-cyan-900/30',
    'text': 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
    'ring': 'focus:ring-cyan-500',
    'icon': 'text-cyan-400',
    'buttonBg': 'bg-cyan-500',
    'buttonBgHover': 'hover:bg-cyan-600',
    'buttonRing': 'focus:ring-cyan-400'
  },
  'indigo': {
    'border': 'hover:border-indigo-400 dark:hover:border-indigo-500',
    'bg': 'hover:bg-indigo-100/80 dark:hover:bg-indigo-900/30',
    'text': 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    'ring': 'focus:ring-indigo-500',
    'icon': 'text-indigo-400',
    'buttonBg': 'bg-indigo-500',
    'buttonBgHover': 'hover:bg-indigo-600',
    'buttonRing': 'focus:ring-indigo-400'
  },
  'green': {
    'border': 'hover:border-green-400 dark:hover:border-green-500',
    'bg': 'hover:bg-green-100/80 dark:hover:bg-green-900/30',
    'text': 'group-hover:text-green-600 dark:group-hover:text-green-400',
    'ring': 'focus:ring-green-500',
    'icon': 'text-green-400',
    'buttonBg': 'bg-green-500',
    'buttonBgHover': 'hover:bg-green-600',
    'buttonRing': 'focus:ring-green-400'
  },
  'emerald': {
    'border': 'hover:border-emerald-400 dark:hover:border-emerald-500',
    'bg': 'hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30',
    'text': 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    'ring': 'focus:ring-emerald-500',
    'icon': 'text-emerald-400',
    'buttonBg': 'bg-emerald-500',
    'buttonBgHover': 'hover:bg-emerald-600',
    'buttonRing': 'focus:ring-emerald-400'
  },
  'teal': {
    'border': 'hover:border-teal-400 dark:hover:border-teal-500',
    'bg': 'hover:bg-teal-100/80 dark:hover:bg-teal-900/30',
    'text': 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    'ring': 'focus:ring-teal-500',
    'icon': 'text-teal-400',
    'buttonBg': 'bg-teal-500',
    'buttonBgHover': 'hover:bg-teal-600',
    'buttonRing': 'focus:ring-teal-400'
  },
  'lime': {
    'border': 'hover:border-lime-400 dark:hover:border-lime-500',
    'bg': 'hover:bg-lime-100/80 dark:hover:bg-lime-900/30',
    'text': 'group-hover:text-lime-600 dark:group-hover:text-lime-400',
    'ring': 'focus:ring-lime-500',
    'icon': 'text-lime-400',
    'buttonBg': 'bg-lime-500',
    'buttonBgHover': 'hover:bg-lime-600',
    'buttonRing': 'focus:ring-lime-400'
  }
};

export const PANEL_CONTAINER_CLASS =
  'w-[32rem] h-full overflow-y-auto ' +
  'absolute left-0 top-0 z-[100] ' +
  'bg-slate-50/90 dark:bg-slate-900/90 ' +
  'border-r border-slate-200/60 dark:border-slate-700/60';

export const PANEL_CONTAINER_RIGHT_CLASS =
  'w-72 h-full flex flex-col overflow-hidden ' +
  'absolute right-0 top-0 z-10 ' +
  'bg-slate-50/90 dark:bg-slate-900/90 ' +
  'border-l border-slate-200/60 dark:border-slate-700/60';

export const PANEL_HEADER_CLASS =
  'px-4 py-4 border-b border-slate-200/60 dark:border-slate-700/60 ' +
  'flex items-center justify-between';

export const PANEL_TITLE_CLASS =
  'text-base font-medium text-slate-500 dark:text-slate-400 ' +
  'flex items-center gap-2';

export const PANEL_CONTENT_CLASS =
  'p-6 flex flex-col gap-6';

export const PANEL_CLOSE_BTN_CLASS =
  'p-2 rounded-full text-slate-400 dark:text-slate-500 ' +
  'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 ' +
  'transition-colors flex-shrink-0';

export const SECTION_BASE_CLASS =
  'group rounded p-4 ' +
  'border border-slate-200/40 dark:border-slate-700/40 ' +
  'bg-slate-100/60 dark:bg-slate-800/60 ' +
  'transition-all duration-300';

export const SECTION_TITLE_CLASS =
  'text-sm font-medium text-slate-400 dark:text-slate-500 ' +
  'mb-3 flex items-center gap-2 ' +
  'transition-colors duration-300';

export const getSectionClasses = (color: HoverColorType): {
  container: string;
  title: string;
} => {
  const config = hoverColorConfig[color];
  return {
    'container': `${SECTION_BASE_CLASS} ${config.border} ${config.bg}`,
    'title': `${SECTION_TITLE_CLASS} ${config.text}`
  };
};

export const INPUT_CLASS =
  'w-full px-3 py-2 rounded ' +
  'border border-slate-200/60 dark:border-slate-700/60 ' +
  'bg-slate-200/50 dark:bg-slate-800/80 ' +
  'text-slate-600 dark:text-slate-300 ' +
  'placeholder:text-slate-400/70 dark:placeholder:text-slate-500/70 ' +
  'focus:outline-none ' +
  'focus:border-slate-300 dark:focus:border-slate-600 ' +
  'focus:ring-1 focus:ring-slate-300/50 dark:focus:ring-slate-600/50 ' +
  'transition-all duration-200 ' +
  'hover:border-slate-300 dark:hover:border-slate-600';

export const LABEL_CLASS =
  'block text-xs font-medium text-slate-400/80 dark:text-slate-500/80 ' +
  'uppercase tracking-wide mb-1';

export const getInputClass = (color: HoverColorType): string => {
  const ring = hoverColorConfig[color].ring;
  return INPUT_CLASS
    .replace('focus:ring-slate-300/50 dark:focus:ring-slate-600/50', ring);
};

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export const getButtonClasses = (
  variant: ButtonVariant,
  color: HoverColorType = 'sky'
): string => {
  const config = hoverColorConfig[color];
  const base = 'px-4 py-2 rounded font-medium transition-all duration-300 ' +
    'flex items-center justify-center gap-2 focus:outline-none';

  switch (variant) {
    case 'primary':
      return `${base} text-white ${config.buttonBg} ${config.buttonBgHover} ` +
        `${config.buttonRing} focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900`;
    case 'secondary':
      return `${base} border border-slate-200/60 dark:border-slate-700/60 ` +
        'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 ' +
        `${config.border} ${config.text} focus:ring-1 focus:ring-slate-300/50`;
    case 'danger':
      return `${base} text-white bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-red-500`;
    case 'ghost':
      return `${base} text-slate-400 dark:text-slate-500 ` +
        'hover:bg-slate-100/60 dark:hover:bg-slate-800/60 ' +
        'hover:text-slate-600 dark:hover:text-slate-300 focus:ring-1 focus:ring-slate-300/50';
    default:
      return base;
  }
};

export const BUTTON_DISABLED_CLASS =
  'opacity-50 cursor-not-allowed pointer-events-none';

export const TAB_CONTAINER_CLASS =
  'bg-slate-100/40 dark:bg-slate-800/40 backdrop-blur-sm z-10';

export const TAB_BUTTON_BASE_CLASS =
  'flex-1 py-3 px-6 text-sm font-medium transition-all flex items-center justify-center gap-2';

export const getTabButtonClasses = (
  isActive: boolean,
  color: HoverColorType = 'sky'
): string => {
  const config = hoverColorConfig[color];
  if (isActive) {
    return `${TAB_BUTTON_BASE_CLASS} ${config.text} border-b-2 border-slate-300/50 dark:border-slate-600/50 bg-slate-100/60 dark:bg-slate-800/60`;
  }
  return `${TAB_BUTTON_BASE_CLASS} text-slate-500 dark:text-slate-400`;
};

export const DROPDOWN_MENU_CLASS =
  'absolute right-0 top-full mt-1 bg-slate-50 dark:bg-slate-800 ' +
  'border border-slate-200/60 dark:border-slate-700/60 rounded z-20 py-1 min-w-[100px]';

export const PANEL_MOTION_VARIANTS_LEFT = {
  'initial': { 'translateX': '-100%', 'opacity': 0 },
  'animate': { 'translateX': 0, 'opacity': 1 },
  'exit': { 'translateX': '-100%', 'opacity': 0 }
} as const;

export const PANEL_MOTION_VARIANTS_RIGHT = {
  'initial': { 'translateX': '100%', 'opacity': 0 },
  'animate': { 'translateX': 0, 'opacity': 1 },
  'exit': { 'translateX': '100%', 'opacity': 0 }
} as const;

export const PANEL_MOTION_TRANSITION = {
  'duration': 0.3,
  'ease': [0.4, 0, 0.2, 1]
} as const;

export { hoverColorConfig };
export type { HoverColorType, HoverColorClasses };
