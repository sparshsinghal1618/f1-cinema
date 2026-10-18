// Adaptive quality manager. One source of truth for device pixel ratio, shadow
// resolution, particle counts and post-processing, driven by three presets and a
// conservative frame-rate watchdog.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { detectGpu, type GpuInfo } from './webgl';

export type Preset = 'eco' | 'balanced' | 'cinema';

export interface QualitySettings {
  preset: Preset;
  label: string;
  blurb: string;
  /** devicePixelRatio clamp handed to react-three-fiber. */
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  particles: number;
  post: boolean;
  anisotropy: number;
  reflectionRes: number;
  contactShadows: boolean;
  envRes: number;
  /** how many scenery props the game track adds. */
  scenery: number;
}

export const PRESETS: Record<Preset, QualitySettings> = {
  eco: {
    preset: 'eco',
    label: 'ECO',
    blurb: 'Integrated graphics, laptops and mobile',
    dpr: [0.75, 1],
    shadows: false,
    shadowMapSize: 512,
    particles: 140,
    post: false,
    anisotropy: 2,
    reflectionRes: 128,
    contactShadows: false,
    envRes: 256,
    scenery: 0.45,
  },
  balanced: {
    preset: 'balanced',
    label: 'BALANCED',
    blurb: 'Default adaptive experience',
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    particles: 520,
    post: false,
    anisotropy: 4,
    reflectionRes: 256,
    contactShadows: true,
    envRes: 512,
    scenery: 0.75,
  },
  cinema: {
    preset: 'cinema',
    label: 'CINEMA',
    blurb: 'Full quality for capable desktop GPUs',
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    particles: 1400,
    post: true,
    anisotropy: 8,
    reflectionRes: 512,
    contactShadows: true,
    envRes: 1024,
    scenery: 1,
  },
};

const STORAGE_KEY = 'f1:quality';

export interface QualityContextValue {
  preset: Preset;
  settings: QualitySettings;
  auto: boolean;
  setPreset: (preset: Preset) => void;
  setAuto: (auto: boolean) => void;
  gpu: GpuInfo;
  notice: string | null;
  clearNotice: () => void;
  cinemaWarning: boolean;
  fps: number;
}

const QualityContext = createContext<QualityContextValue | null>(null);

function startingPreset(gpu: GpuInfo): { preset: Preset; auto: boolean } {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Preset | null;
    if (stored && stored in PRESETS) return { preset: stored, auto: false };
  } catch {
    /* storage can be unavailable in private modes */
  }
  if (!gpu.webgl || gpu.tier === 'low') return { preset: 'eco', auto: true };
  return { preset: 'balanced', auto: true };
}

export function QualityProvider({ children }: { children: ReactNode }) {
  const gpu = useMemo(() => detectGpu(), []);
  const initial = useMemo(() => startingPreset(gpu), [gpu]);
  const [preset, setPresetState] = useState<Preset>(initial.preset);
  const [auto, setAutoState] = useState(initial.auto);
  const [notice, setNotice] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  const setPreset = useCallback((next: Preset) => {
    setPresetState(next);
    setAutoState(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setAuto = useCallback((next: boolean) => {
    setAutoState(next);
    if (!next) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  // Frame-rate watchdog. Only runs in auto mode and while the tab is visible,
  // and it only ever steps quality down so it cannot oscillate between presets.
  useEffect(() => {
    if (!auto) return;
    let raf = 0;
    let frames = 0;
    let start = performance.now();
    let weakStreak = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.visibilityState !== 'visible') {
        start = now;
        frames = 0;
        return;
      }
      frames += 1;
      const elapsed = now - start;
      if (elapsed < 1000) return;

      const measured = (frames * 1000) / elapsed;
      frames = 0;
      start = now;
      setFps(Math.round(measured));

      const current = presetRef.current;
      if (current !== 'eco' && measured < 34) {
        weakStreak += 1;
        if (weakStreak >= 3) {
          weakStreak = 0;
          const next: Preset = current === 'cinema' ? 'balanced' : 'eco';
          setPresetState(next);
          setNotice(
            `Average frame rate fell to ${Math.round(measured)} fps, so quality was reduced to ${PRESETS[next].label}.`,
          );
        }
      } else {
        weakStreak = 0;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  const value = useMemo<QualityContextValue>(
    () => ({
      preset,
      settings: PRESETS[preset],
      auto,
      setPreset,
      setAuto,
      gpu,
      notice,
      clearNotice,
      cinemaWarning: preset === 'cinema' && gpu.tier === 'low',
      fps,
    }),
    [preset, auto, setPreset, setAuto, gpu, notice, clearNotice, fps],
  );

  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useQuality(): QualityContextValue {
  const context = useContext(QualityContext);
  if (!context) throw new Error('useQuality must be used inside QualityProvider');
  return context;
}
