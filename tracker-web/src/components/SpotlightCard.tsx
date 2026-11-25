import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  type Target,
  type Transition,
} from 'framer-motion';

/** Tracks currently highlighted touch card so tapping a new card clears any previous one. */
let activeTouchReset: (() => void) | null = null;

export type SpotlightTone = 'sky' | 'amber' | 'emerald' | 'radar';

interface ThemeConfig {
  orbGradient: string;
  hoverBg: string;
  hoverBorder: string;
  hoverShadow: string;
  accentType: 'top-hairline' | 'left-beacon' | 'radar-sweep';
  accentClass: string;
  sweepClass?: string;
  spring: { stiffness: number; damping: number; mass: number };
}

const SPOTLIGHT_THEMES: Record<SpotlightTone, ThemeConfig> = {
  sky: {
    orbGradient:
      'radial-gradient(closest-side, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.06) 55%, transparent 100%)',
    hoverBg: 'bg-slate-900/90',
    hoverBorder: 'border-sky-400/60',
    hoverShadow: 'shadow-lg shadow-sky-950/35',
    accentType: 'top-hairline',
    accentClass: 'via-sky-300/80',
    spring: { stiffness: 320, damping: 28, mass: 0.35 },
  },
  amber: {
    orbGradient:
      'radial-gradient(closest-side, rgba(251, 191, 36, 0.22), rgba(249, 115, 22, 0.08) 55%, transparent 100%)',
    hoverBg: 'bg-slate-900',
    hoverBorder: 'border-amber-400/75',
    hoverShadow: 'shadow-lg shadow-amber-950/35',
    accentType: 'left-beacon',
    accentClass: 'from-amber-300 via-amber-400 to-orange-500',
    spring: { stiffness: 360, damping: 26, mass: 0.32 },
  },
  emerald: {
    orbGradient:
      'radial-gradient(closest-side, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.07) 55%, transparent 100%)',
    hoverBg: 'bg-emerald-950/70',
    hoverBorder: 'border-emerald-400/65',
    hoverShadow: 'shadow-lg shadow-emerald-950/35',
    accentType: 'left-beacon',
    accentClass: 'from-emerald-300 via-emerald-400 to-teal-400',
    spring: { stiffness: 340, damping: 28, mass: 0.35 },
  },
  radar: {
    orbGradient:
      'radial-gradient(closest-side, rgba(16, 185, 129, 0.19), rgba(56, 189, 248, 0.07) 55%, transparent 100%)',
    hoverBg: 'bg-slate-900/90',
    hoverBorder: 'border-emerald-400/60',
    hoverShadow: 'shadow-lg shadow-emerald-950/35',
    accentType: 'radar-sweep',
    accentClass: 'via-emerald-400/85',
    sweepClass: 'from-transparent via-emerald-300/90 to-sky-300/0',
    spring: { stiffness: 420, damping: 24, mass: 0.28 },
  },
};

export interface SpotlightCardProps {
  children: React.ReactNode;
  as?: 'div' | 'section' | 'button';
  tone?: SpotlightTone;
  radius?: number;
  forceActive?: boolean;
  className?: string;
  contentClassName?: string;
  restingBgClassName?: string;
  hoverBgClassName?: string;
  restingBorderClassName?: string;
  hoverBorderClassName?: string;
  initial?: boolean | Target;
  animate?: Target;
  exit?: Target;
  transition?: Transition;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onBlur?: React.FocusEventHandler<HTMLElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  onPointerEnter?: React.PointerEventHandler<HTMLElement>;
  onPointerDown?: React.PointerEventHandler<HTMLElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  role?: React.AriaRole;
  tabIndex?: number;
  ariaLabel?: string;
}

/**
 * Lightweight GPU-accelerated spotlight card.
 * Supports smooth desktop mouse/stylus tracking AND mobile finger touch tap/drag
 * using pure translate3d transform on a pre-rendered radial orb.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  as = 'div',
  tone = 'sky',
  radius = 420,
  forceActive = false,
  className = '',
  contentClassName = '',
  restingBgClassName = 'bg-slate-950/45',
  hoverBgClassName,
  restingBorderClassName = 'border-slate-800/80',
  hoverBorderClassName,
  initial,
  animate,
  exit,
  transition,
  onClick,
  onFocus,
  onBlur,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  onPointerEnter,
  onPointerDown,
  onPointerCancel,
  disabled,
  type = 'button',
  role,
  tabIndex,
  ariaLabel,
}) => {
  const theme = SPOTLIGHT_THEMES[tone];
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [sweepKey, setSweepKey] = useState(0);
  const hasPointerMovedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const touchTimerRef = useRef<number | null>(null);
  const clearTouchRef = useRef<() => void>(() => {});

  const orbSize = Math.round(radius * 1.45);
  const orbHalf = orbSize * 0.5;
  const active = (isHovered || isTouchActive || forceActive) && !disabled;

  const targetX = useMotionValue(-orbHalf);
  const targetY = useMotionValue(-orbHalf);
  const orbX = useSpring(targetX, theme.spring);
  const orbY = useSpring(targetY, theme.spring);

  const clearTouch = () => {
    if (touchTimerRef.current !== null) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    setIsTouchActive(false);
    if (activeTouchReset === clearTouchRef.current) {
      activeTouchReset = null;
    }
  };
  clearTouchRef.current = clearTouch;

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (touchTimerRef.current !== null) {
        window.clearTimeout(touchTimerRef.current);
      }
      if (activeTouchReset === clearTouchRef.current) {
        activeTouchReset = null;
      }
    };
  }, []);

  const moveOrbToCenter = (cx: number, cy: number, snap: boolean) => {
    const ox = cx - orbHalf;
    const oy = cy - orbHalf;
    if (snap) {
      targetX.jump(ox);
      targetY.jump(oy);
      orbX.jump(ox);
      orbY.jump(oy);
    } else {
      targetX.set(ox);
      targetY.set(oy);
    }
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    onPointerEnter?.(e);
    if (disabled || e.pointerType === 'touch') return;
    hasPointerMovedRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    moveOrbToCenter(e.clientX - rect.left, e.clientY - rect.top, true);
    setIsHovered(true);
    if (theme.accentType === 'radar-sweep') {
      setSweepKey((k) => k + 1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    onPointerDown?.(e);
    if (disabled || e.pointerType !== 'touch') return;
    if (activeTouchReset && activeTouchReset !== clearTouchRef.current) {
      activeTouchReset();
    }
    activeTouchReset = clearTouchRef.current;
    if (touchTimerRef.current !== null) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    moveOrbToCenter(e.clientX - rect.left, e.clientY - rect.top, true);
    setIsTouchActive(true);
    if (theme.accentType === 'radar-sweep') {
      setSweepKey((k) => k + 1);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (disabled) return;
    const isTouch = e.pointerType === 'touch';
    if (isTouch && !isTouchActive) return;
    if (!isTouch) {
      hasPointerMovedRef.current = true;
    }
    const { clientX, clientY, currentTarget } = e;
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const rect = currentTarget.getBoundingClientRect();
      moveOrbToCenter(clientX - rect.left, clientY - rect.top, false);
    });
    if (!isTouch && !isHovered) setIsHovered(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch') return;
    if (touchTimerRef.current !== null) {
      window.clearTimeout(touchTimerRef.current);
    }
    touchTimerRef.current = window.setTimeout(() => {
      clearTouch();
    }, 1400);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    onPointerCancel?.(e);
    if (e.pointerType === 'touch') {
      clearTouch();
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    hasPointerMovedRef.current = false;
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsHovered(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (!hasPointerMovedRef.current && !isTouchActive) {
      const rect = e.currentTarget.getBoundingClientRect();
      moveOrbToCenter(rect.width * 0.25, rect.height * 0.5, true);
    }
    onFocus?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!isTouchActive) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      hasPointerMovedRef.current = false;
      setIsHovered(false);
    }
    onMouseLeave?.(e);
  };

  const surfaceClasses = `relative overflow-hidden rounded-2xl border transition-colors duration-200 ${
    active
      ? `${hoverBgClassName ?? theme.hoverBg} ${
          hoverBorderClassName ?? theme.hoverBorder
        } ${theme.hoverShadow}`
      : `${restingBgClassName} ${restingBorderClassName}`
  } ${className}`;

  const innerContent = (
    <>
      {theme.accentType === 'left-beacon' ? (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, scaleY: 0.35 }}
          animate={{
            opacity: active ? 1 : 0,
            scaleY: active ? 1 : 0.35,
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className={`no-print pointer-events-none absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b ${theme.accentClass} origin-center`}
        />
      ) : (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          className={`no-print pointer-events-none absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent ${theme.accentClass} to-transparent`}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}

      {theme.accentType === 'radar-sweep' && active && (
        <motion.div
          key={sweepKey}
          aria-hidden="true"
          initial={{ x: '-100%', opacity: 0.85 }}
          animate={{ x: '220%', opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className={`no-print pointer-events-none absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r ${theme.sweepClass}`}
        />
      )}

      {/* GPU translate3d cached radial spotlight orb (zero gradient string repaints) */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          x: orbX,
          y: orbY,
          width: orbSize,
          height: orbSize,
          background: theme.orbGradient,
          willChange: 'transform, opacity',
        }}
        className="no-print pointer-events-none absolute top-0 left-0 rounded-full"
      />

      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </>
  );

  const MotionTag = (
    as === 'button'
      ? motion.button
      : as === 'section'
      ? motion.section
      : motion.div
  ) as React.ComponentType<Record<string, unknown>>;

  return (
    <MotionTag
      type={as === 'button' ? type : undefined}
      disabled={as === 'button' ? disabled : undefined}
      role={as === 'div' ? role : undefined}
      tabIndex={as === 'div' ? tabIndex : undefined}
      aria-label={ariaLabel}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      onClick={onClick}
      onFocus={handleFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      className={surfaceClasses}
    >
      {innerContent}
    </MotionTag>
  );
};
