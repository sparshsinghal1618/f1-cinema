// Site footer: the honest disclaimer, the display toggles and the asset credit.

import { useState } from 'react';
import { Contrast, ExternalLink, Music, Video } from 'lucide-react';
import { BRAND, DISCLAIMER, NAV_ITEMS } from '../data/site';
import { usePrefs, setPref } from '../lib/prefs';
import { audio } from '../lib/audio';

export function SiteFooter() {
  const prefs = usePrefs();
  const [soundOn, setSoundOn] = useState(() => audio.enabled && !audio.muted);

  return (
    <footer className="footer" id="footer">
      <div className="shell footer__inner">
        <div className="footer__brand">
          <p className="display h3">{BRAND.name}</p>
          <p className="mono">{BRAND.edition}</p>
          <p className="copy footer__tagline">{BRAND.tagline}</p>
        </div>

        <nav className="footer__nav" aria-label="Sections">
          <p className="mono">Sections</p>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>
                  <span className="mono">{item.index}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__display">
          <p className="mono">Display</p>
          <button
            type="button"
            className={`chip${prefs.reduce ? ' is-on' : ''}`}
            aria-pressed={prefs.reduce}
            onClick={() => setPref('reduce', !prefs.reduce)}
          >
            <Video size={13} aria-hidden="true" />
            Reduced motion
          </button>
          <button
            type="button"
            className={`chip${prefs.readable ? ' is-on' : ''}`}
            aria-pressed={prefs.readable}
            onClick={() => setPref('readable', !prefs.readable)}
          >
            <Contrast size={13} aria-hidden="true" />
            Reading mode
          </button>
          <button
            type="button"
            className={`chip${soundOn ? ' is-on' : ''}`}
            aria-pressed={soundOn}
            onClick={() => {
              if (!audio.enabled) {
                void audio.enable();
                setSoundOn(true);
              } else {
                const next = !soundOn;
                audio.setMuted(!next);
                setSoundOn(next);
              }
            }}
          >
            <Music size={13} aria-hidden="true" />
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
          <p className="mono footer__hint">
            Motion and reading preferences are stored in this browser only.
          </p>
        </div>

        <div className="footer__credits">
          <p className="mono">Assets</p>
          <p className="copy">
            Photography downloaded from Wikimedia Commons and used under the licences recorded in{' '}
            <code>ASSETS-LICENSES.md</code>. Environmental lighting and surface textures from Poly Haven (CC0). Fonts
            under the SIL Open Font License. Every asset is stored locally — nothing is fetched at runtime.
          </p>
          <p className="copy">
            The car, circuit layouts, telemetry, race weekend, pit-stop timings and the F1 Concept team are original works
            created for this project.
          </p>
          <div className="row gap-12 wrap">
            <a className="btn btn--ghost" href="https://commons.wikimedia.org" target="_blank" rel="noreferrer noopener">
              Wikimedia Commons
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            <a className="btn btn--ghost" href="https://polyhaven.com" target="_blank" rel="noreferrer noopener">
              Poly Haven
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="shell footer__legal">
        <p className="copy">{DISCLAIMER}</p>
      </div>
    </footer>
  );
}
