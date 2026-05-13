import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SlidingCardOption<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

type CardColor = 'sky' | 'emerald' | 'indigo' | 'cyan' | 'lime' | 'blue' | 'teal' | 'green' | 'red' | 'amber';

interface SlidingCardSelectorProps<T extends string = string> {
  options: SlidingCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  color?: CardColor;
  height?: number;
  showIcon?: boolean;
  className?: string;
}

const COLOR_CONFIGS: Record<CardColor, {
  active: {
    border: string;
    bg: string;
    darkBg: string;
    text: string;
    darkText: string;
    iconText: string;
    darkIconText: string;
  };
  side: {
    border: string;
    hoverBg: string;
    darkHoverBg: string;
    text: string;
    darkText: string;
    iconText: string;
  };
}> = {
  'sky': {
    'active': {
      'border': 'border-sky-400',
      'bg': 'bg-sky-50/60',
      'darkBg': 'dark:bg-sky-900/20',
      'text': 'text-sky-600',
      'darkText': 'dark:text-sky-400',
      'iconText': 'text-sky-500',
      'darkIconText': 'dark:text-sky-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'emerald': {
    'active': {
      'border': 'border-emerald-400',
      'bg': 'bg-emerald-50/60',
      'darkBg': 'dark:bg-emerald-900/20',
      'text': 'text-emerald-600',
      'darkText': 'dark:text-emerald-400',
      'iconText': 'text-emerald-500',
      'darkIconText': 'dark:text-emerald-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'green': {
    'active': {
      'border': 'border-green-400',
      'bg': 'bg-green-50/60',
      'darkBg': 'dark:bg-green-900/20',
      'text': 'text-green-600',
      'darkText': 'dark:text-green-400',
      'iconText': 'text-green-500',
      'darkIconText': 'dark:text-green-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'indigo': {
    'active': {
      'border': 'border-indigo-400',
      'bg': 'bg-indigo-50/60',
      'darkBg': 'dark:bg-indigo-900/20',
      'text': 'text-indigo-600',
      'darkText': 'dark:text-indigo-400',
      'iconText': 'text-indigo-500',
      'darkIconText': 'dark:text-indigo-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'cyan': {
    'active': {
      'border': 'border-cyan-400',
      'bg': 'bg-cyan-50/60',
      'darkBg': 'dark:bg-cyan-900/20',
      'text': 'text-cyan-600',
      'darkText': 'dark:text-cyan-400',
      'iconText': 'text-cyan-500',
      'darkIconText': 'dark:text-cyan-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'lime': {
    'active': {
      'border': 'border-lime-400',
      'bg': 'bg-lime-50/60',
      'darkBg': 'dark:bg-lime-900/20',
      'text': 'text-lime-600',
      'darkText': 'dark:text-lime-400',
      'iconText': 'text-lime-500',
      'darkIconText': 'dark:text-lime-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'blue': {
    'active': {
      'border': 'border-blue-400',
      'bg': 'bg-blue-50/60',
      'darkBg': 'dark:bg-blue-900/20',
      'text': 'text-blue-600',
      'darkText': 'dark:text-blue-400',
      'iconText': 'text-blue-500',
      'darkIconText': 'dark:text-blue-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'teal': {
    'active': {
      'border': 'border-teal-400',
      'bg': 'bg-teal-50/60',
      'darkBg': 'dark:bg-teal-900/20',
      'text': 'text-teal-600',
      'darkText': 'dark:text-teal-400',
      'iconText': 'text-teal-500',
      'darkIconText': 'dark:text-teal-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'red': {
    'active': {
      'border': 'border-red-400',
      'bg': 'bg-red-50/60',
      'darkBg': 'dark:bg-red-900/20',
      'text': 'text-red-600',
      'darkText': 'dark:text-red-400',
      'iconText': 'text-red-500',
      'darkIconText': 'dark:text-red-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  },
  'amber': {
    'active': {
      'border': 'border-amber-400',
      'bg': 'bg-amber-50/60',
      'darkBg': 'dark:bg-amber-900/20',
      'text': 'text-amber-600',
      'darkText': 'dark:text-amber-400',
      'iconText': 'text-amber-500',
      'darkIconText': 'dark:text-amber-400'
    },
    'side': {
      'border': 'border-slate-200/40',
      'hoverBg': 'hover:bg-slate-100/60',
      'darkHoverBg': 'dark:hover:bg-slate-800/60',
      'text': 'text-slate-500',
      'darkText': 'dark:text-slate-400',
      'iconText': 'text-slate-400'
    }
  }
};

const VARIANTS = {
  'enter': (dir: number) => ({ 'x': dir > 0 ? 60 : -60, 'opacity': 0 }),
  'center': { 'x': 0, 'opacity': 1 },
  'exit': (dir: number) => ({ 'x': dir < 0 ? 60 : -60, 'opacity': 0 })
};

const SIDE_VARIANTS = {
  'enter': (dir: number) => ({ 'x': dir > 0 ? 60 : -60, 'opacity': 0 }),
  'center': { 'x': 0, 'opacity': 0.4 },
  'exit': (dir: number) => ({ 'x': dir < 0 ? 60 : -60, 'opacity': 0 })
};

const TRANSITION = { 'duration': 0.2, 'ease': 'easeOut' as const };

export function SlidingCardSelector<T extends string = string> ({
  options,
  value,
  onChange,
  color = 'sky',
  height = 80,
  showIcon = true,
  className = ''
}: SlidingCardSelectorProps<T>) {
  const [direction, setDirection] = useState(0);

  const currentIndex = options.findIndex(opt => opt.value === value);
  const colors = COLOR_CONFIGS[color];

  const handlePrev = () => {
    setDirection(-1);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    const prevOpt = options[prevIndex];
    if (prevOpt) {
      onChange(prevOpt.value);
    }
  };

  const handleNext = () => {
    setDirection(1);
    const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    const nextOpt = options[nextIndex];
    if (nextOpt) {
      onChange(nextOpt.value);
    }
  };

  const renderOption = (
    opt: SlidingCardOption<T>,
    position: 'prev' | 'current' | 'next',
    onClick?: () => void
  ): ReactNode => {
    const isCurrent = position === 'current';
    const activeConfig = colors.active;
    const sideConfig = colors.side;

    return (
      <motion.button
        key={`${position}-${opt.value}`}
        custom={direction}
        variants={isCurrent ? VARIANTS : SIDE_VARIANTS}
        initial="enter"
        animate="center"
        exit="exit"
        transition={TRANSITION}
        onClick={onClick}
        className={`flex-1 flex ${showIcon ? 'flex-col' : 'items-center'} items-center justify-center gap-1 p-${height > 70 ? '3' : '2'} rounded ${
          isCurrent ? `border-2 ${activeConfig.border} ${activeConfig.bg} ${activeConfig.darkBg}` : `border ${sideConfig.border} ${sideConfig.hoverBg} ${sideConfig.darkHoverBg}`
        }`}
      >
        {showIcon && opt.icon && (
          <opt.icon className={`w-${height > 70 ? '5' : '4'} h-${height > 70 ? '5' : '4'} ${isCurrent ? activeConfig.iconText : sideConfig.iconText} ${isCurrent ? activeConfig.darkIconText : ''}`} />
        )}
        <span className={`text-${height > 70 ? 'xs' : '[11px]'} ${isCurrent ? activeConfig.text : sideConfig.text} ${isCurrent ? activeConfig.darkText : ''}`}>
          {opt.label}
        </span>
      </motion.button>
    );
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handlePrev}
        className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      <div
        className="flex-1 flex items-center justify-center gap-2 overflow-hidden"
        style={{ 'height': `${height}px` }}
      >
        <AnimatePresence custom={direction}>
          {(() => {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
            const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
            const prevOpt = options[prevIndex];
            const currentOpt = options[currentIndex];
            const nextOpt = options[nextIndex];

            if (!prevOpt || !currentOpt || !nextOpt) {
              return null;
            }

            return (
              <>
                {renderOption(prevOpt, 'prev', handlePrev)}
                {renderOption(currentOpt, 'current')}
                {renderOption(nextOpt, 'next', handleNext)}
              </>
            );
          })()}
        </AnimatePresence>
      </div>

      <button
        onClick={handleNext}
        className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export default SlidingCardSelector;
