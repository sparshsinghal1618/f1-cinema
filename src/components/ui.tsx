// Shared presentational primitives: section headings, scroll reveals, image
// frames that degrade gracefully, the lightbox and a render boundary.

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { hasImage, imageCredit, imageSizes, imageSrc, imageSrcSet, placeholderFor } from '../lib/assets';
import { prefersReducedMotion } from '../lib/motion';

/* ------------------------------------------------------------------ header */

export function SectionHeader({
  index,
  eyebrow,
  title,
  lede,
  actions,
  titleId,
}: {
  index: string;
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
}) {
  const { ref, className, style } = useReveal<HTMLElement>();
  return (
    <header ref={ref} className={`head ${className}`} style={style}>
      <div className="head__meta">
        <span className="head__index">{index}</span>
        <hr className="rule grow" />
        {eyebrow && <span className="mono">{eyebrow}</span>}
      </div>
      <div className="head__row">
        <h2 className="display h2 head__title" id={titleId}>
          {title}
        </h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="head__actions">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ reveal */

/**
 * IntersectionObserver reveal. Returns a ref and class name so the caller can
 * put them on any element — section, row, list item — without a wrapper. The
 * animation is skipped entirely when the visitor prefers reduced motion.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  delay = 0,
  options: { rootMargin?: string; threshold?: number } = {},
): { ref: RefObject<T | null>; className: string; style: CSSProperties } {
  const { rootMargin = '0px 0px -8% 0px', threshold = 0.08 } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return {
    ref,
    className: inView ? 'reveal is-in' : 'reveal',
    style: { '--reveal-delay': `${delay}ms` } as CSSProperties,
  };
}

/**
 * Staggered reveal for lists and grids: one observer watches the container and
 * its children build up in sequence. Mark each child with `revealIndex(i)`.
 */
export function useRevealGroup<T extends HTMLElement = HTMLUListElement>(
  step = 70,
  options: { rootMargin?: string; threshold?: number } = {},
): { ref: RefObject<T | null>; className: string; style: CSSProperties } {
  const { rootMargin = '0px 0px -8% 0px', threshold = 0.06 } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return {
    ref,
    className: inView ? 'reveal-group is-in' : 'reveal-group',
    style: { '--reveal-step': `${step}ms` } as CSSProperties,
  };
}

/** Inline style that gives a child its position within a reveal group. */
export function revealIndex(index: number): CSSProperties {
  return { '--reveal-i': index } as CSSProperties;
}

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, className: revealClass, style } = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={ref} className={`${revealClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ blocks */

export function Notice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`notice ${className}`.trim()}>{children}</p>;
}

export function StatList({
  items,
  className = '',
}: {
  items: { label: string; value: ReactNode; note?: string }[];
  className?: string;
}) {
  return (
    <dl className={`stats ${className}`.trim()}>
      {items.map((item) => (
        <div className="stats__item" key={item.label}>
          <dt className="mono">{item.label}</dt>
          <dd className="data">{item.value}</dd>
          {item.note && <dd className="stats__note">{item.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------- frame */

export interface ImageFrameProps {
  /** Key into the generated image index; omit when passing an explicit src. */
  imageKey?: string;
  src?: string;
  alt: string;
  /** CSS aspect-ratio value, e.g. "16 / 9". */
  ratio?: string;
  sizes?: string;
  position?: string;
  priority?: boolean;
  className?: string;
  onClick?: () => void;
  tabIndex?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}

/**
 * Responsive image with a blurred low-quality placeholder, a fade-in and a
 * labelled fallback panel when the file is missing or fails to decode.
 */
export function ImageFrame({
  imageKey,
  src,
  alt,
  ratio,
  sizes,
  position,
  priority = false,
  className = '',
  onClick,
  tabIndex,
  onKeyDown,
}: ImageFrameProps) {
  const resolved = src ?? (imageKey && hasImage(imageKey) ? imageSrc(imageKey) : undefined);
  const lqip = imageKey ? placeholderFor(imageKey) : undefined;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!resolved);

  useEffect(() => {
    setLoaded(false);
    setFailed(!resolved);
  }, [resolved]);

  const style = {
    '--frame-ratio': ratio ?? '16 / 9',
    backgroundImage: lqip ? `url(${lqip})` : undefined,
  } as CSSProperties;

  if (failed) {
    return (
      <div className={`frame frame--missing ${className}`.trim()} style={style}>
        <span className="mono">Image unavailable</span>
        <span className="frame__missing-alt">{alt}</span>
      </div>
    );
  }

  const media = (
    <img
      src={resolved}
      srcSet={imageKey ? imageSrcSet(imageKey) : undefined}
      sizes={imageKey ? (sizes ?? imageSizes()) : sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      style={{ objectPosition: position }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );

  const frameClass = `frame${loaded ? ' is-loaded' : ''}${onClick ? ' frame--button' : ''} ${className}`.trim();

  if (onClick) {
    return (
      <button
        type="button"
        className={frameClass}
        style={style}
        onClick={onClick}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
      >
        {media}
      </button>
    );
  }

  return (
    <div className={frameClass} style={style} tabIndex={tabIndex} onKeyDown={onKeyDown}>
      {media}
    </div>
  );
}

/** Small attribution line shown under editorial imagery. */
export function Credit({ imageKey, className = '' }: { imageKey: string; className?: string }) {
  const entry = imageCredit(imageKey);
  if (!entry) return null;
  return (
    <span className={`credit mono ${className}`.trim()}>
      <span>{entry.author}</span>
      <span aria-hidden="true">/</span>
      <a href={entry.licenseUrl} target="_blank" rel="noreferrer noopener">
        {entry.license}
      </a>
    </span>
  );
}

/* ---------------------------------------------------------------- lightbox */

export interface LightboxItem {
  imageKey?: string;
  src?: string;
  alt: string;
  caption?: ReactNode;
}

export function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: LightboxItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (!items.length) return;
      onIndex((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'Home') {
        onIndex(0);
      } else if (event.key === 'End') {
        onIndex(items.length - 1);
      } else if (event.key === 'Tab') {
        // Keep focus inside the dialog.
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [go, onIndex, onClose, items.length]);

  const item = items[index];
  if (!item) return null;
  const src = item.src ?? (item.imageKey && hasImage(item.imageKey) ? imageSrc(item.imageKey) : undefined);
  const entry = item.imageKey ? imageCredit(item.imageKey) : undefined;

  const handleTouchStart = (event: React.TouchEvent) => {
    touchX.current = event.changedTouches[0].clientX;
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 46) return;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      ref={dialogRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="lightbox__bar">
        <span className="mono">
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <span className="mono lightbox__title">{item.alt}</span>
        <button className="btn btn--icon" onClick={onClose} ref={closeRef} aria-label="Close viewer">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="lightbox__stage">
        {src && <img key={src} src={src} alt={item.alt} decoding="async" />}
        <div className="lightbox__caption">
          <p className="copy">{item.caption ?? entry?.title ?? item.alt}</p>
          {entry && (
            <p className="mono">
              {entry.author} — {entry.license} ·{' '}
              <a href={entry.source} target="_blank" rel="noreferrer noopener">
                Wikimedia Commons
              </a>
            </p>
          )}
        </div>
      </div>

      <button className="btn btn--icon lightbox__nav lightbox__prev" onClick={() => go(-1)} aria-label="Previous image">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button className="btn btn--icon lightbox__nav lightbox__next" onClick={() => go(1)} aria-label="Next image">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------- error boundary */

interface BoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  { children: ReactNode; label?: string; fallback?: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.label ?? 'f1'}] render failed`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="panel panel__pad boundary" role="alert">
        <p className="mono">{this.props.label ?? 'Section'}</p>
        <h3 className="h4">This section could not render.</h3>
        <p className="copy">{error.message}</p>
        <div className="row gap-12 wrap">
          <button className="btn btn--primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button className="btn" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
