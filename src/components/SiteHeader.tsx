// Sticky header: section navigation, render-quality control, audio control and
// the mobile drawer. Every control is a real button and keyboard reachable.

import { useEffect, useRef, useState } from 'react';
import { Gauge, Menu, Volume2, VolumeX, X } from 'lucide-react';
import { BRAND, NAV_ITEMS } from '../data/site';
import { PRESETS, useQuality, type Preset } from '../lib/quality';
import { audio } from '../lib/audio';

const SECTION_IDS = NAV_ITEMS.map((item) => item.id);
const PRESET_ORDER: Preset[] = ['eco', 'balanced', 'cinema'];

/* ------------------------------------------------------------- scroll state */

function useScrollState(): { active: string | null; progress: number } {
  const [state, setState] = useState<{ active: string | null; progress: number }>({
    active: null,
    progress: 0,
  });

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const line = window.innerHeight * 0.34;
      let active: string | null = null;
      for (const id of SECTION_IDS) {
        const node = document.getElementById(id);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) active = id;
      }
      setState((previous) =>
        previous.active === active && Math.abs(previous.progress - progress) < 0.002
          ? previous
          : { active, progress },
      );
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return state;
}

/* ----------------------------------------------------------- quality control */

function QualityMenu() {
  const { preset, setPreset, auto, setAuto, fps, cinemaWarning, gpu } = useQuality();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="pop" ref={rootRef}>
      <button
        type="button"
        className="btn btn--sm pop__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((value) => !value);
          audio.ui('tick');
        }}
      >
        <Gauge size={14} aria-hidden="true" />
        <span>{PRESETS[preset].label}</span>
        <span className="sr-only">— change render quality</span>
      </button>

      {open && (
        <div className="pop__panel" role="menu" aria-label="Render quality">
          <p className="mono pop__title">Render quality</p>
          {PRESET_ORDER.map((option) => (
            <button
              type="button"
              key={option}
              role="menuitemradio"
              aria-checked={preset === option}
              className={`pop__opt${preset === option ? ' is-on' : ''}`}
              onClick={() => {
                setPreset(option);
                setOpen(false);
                audio.ui('confirm');
              }}
            >
              <span className="pop__opt-head">
                <strong>{PRESETS[option].label}</strong>
                {preset === option && <span className="pop__opt-dot" aria-hidden="true" />}
              </span>
              <span className="pop__opt-blurb">{PRESETS[option].blurb}</span>
            </button>
          ))}

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={auto}
            className={`pop__auto${auto ? ' is-on' : ''}`}
            onClick={() => {
              setAuto(!auto);
              audio.ui('tick');
            }}
          >
            <span>Adaptive quality</span>
            <span className="mono">{auto ? `${fps} fps` : 'manual'}</span>
          </button>

          <p className="pop__foot mono">
            {gpu.renderer ? gpu.renderer.slice(0, 44) : 'GPU unknown'} · {gpu.tier.toUpperCase()}
          </p>
          {cinemaWarning && (
            <p className="pop__warn">
              CINEMA may run slowly on this GPU. Adaptive quality will step back down automatically.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- sound control */

function SoundControl() {
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    setEnabled(audio.enabled);
    setMuted(audio.muted);
    setVolume(audio.volume);
  }, []);

  if (!audio.supported) return null;

  const onButton = () => {
    if (!enabled) {
      void audio.enable().then(() => {
        setEnabled(audio.enabled);
        setMuted(audio.muted);
        setVolume(audio.volume);
        audio.ui('confirm');
      });
      return;
    }
    const next = !muted;
    audio.setMuted(next);
    setMuted(next);
    audio.ui(next ? 'tick' : 'click');
  };

  const label = !enabled ? 'Sound off' : muted ? 'Muted' : 'Sound on';

  return (
    <div className="sound">
      <button
        type="button"
        className={`btn btn--sm${enabled && !muted ? ' is-on' : ''}`}
        aria-pressed={enabled && !muted}
        onClick={onButton}
      >
        {enabled && !muted ? (
          <Volume2 size={14} aria-hidden="true" />
        ) : (
          <VolumeX size={14} aria-hidden="true" />
        )}
        <span className="sound__label">{label}</span>
      </button>
      {enabled && (
        <input
          className="sound__range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          aria-label="Volume"
          onChange={(event) => {
            const value = Number(event.target.value);
            setVolume(value);
            audio.setVolume(value);
            if (muted && value > 0) {
              audio.setMuted(false);
              setMuted(false);
            }
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- drawer */

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu">
      <div className="drawer__top">
        <span className="mono">{BRAND.name} — Index</span>
        <button type="button" className="btn btn--icon" onClick={onClose} ref={closeRef} aria-label="Close menu">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <nav className="drawer__nav" aria-label="Sections">
        {NAV_ITEMS.map((item) => (
          <a key={item.id} href={`#${item.id}`} className="drawer__link" onClick={onClose}>
            <span className="mono">{item.index}</span>
            <span className="drawer__label">{item.label}</span>
          </a>
        ))}
        <a href="#top" className="drawer__link" onClick={onClose}>
          <span className="mono">00</span>
          <span className="drawer__label">Intro</span>
        </a>
      </nav>
      <div className="drawer__foot">
        <QualityMenu />
        <SoundControl />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- header */

export function SiteHeader() {
  const { active, progress } = useScrollState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="topbar" id="top">
      <div className="topbar__inner">
        <a className="brand" href="#top" aria-label={`${BRAND.name} — back to top`}>
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 56 28" width="34" height="17" focusable="false">
              <path d="M2 2 H17 V7.4 H8.6 V12 H15.4 V17.4 H8.6 V26 H2 Z" fill="currentColor" />
              <path d="M30 26 V9.6 L24 13 V7 L30 3.4 H38 V26 Z" fill="currentColor" />
              <path
                d="M42 8 H52 M42 14 H52 M42 20 H52"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          <span className="brand__text">
            <strong>{BRAND.name}</strong>
            <em>{BRAND.edition}</em>
          </span>
        </a>

        <nav className="nav" aria-label="Sections">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav__link${active === item.id ? ' is-active' : ''}`}
              aria-current={active === item.id ? 'true' : undefined}
            >
              <span className="nav__index">{item.index}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="topbar__controls">
          <QualityMenu />
          <SoundControl />
          <button
            type="button"
            className="btn btn--icon topbar__burger"
            aria-expanded={drawerOpen}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="topbar__progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
