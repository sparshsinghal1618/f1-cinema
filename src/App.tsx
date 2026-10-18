// Application shell.
//
// Provides the adaptive quality context, renders the persistent chrome (header,
// grain overlay, skip link) and the twelve sections in order. Every 3D section is
// wrapped in its own error boundary so one failure cannot take the page down.

import { useEffect } from 'react';
import { QualityProvider, useQuality } from './lib/quality';
import { SiteHeader } from './components/SiteHeader';
import { Opening } from './sections/Opening';
import { Showcase } from './sections/Showcase';
import { Laboratory } from './sections/Laboratory';
import { Race } from './sections/Race';
import { GrandPrix } from './sections/GrandPrix';
import { Telemetry } from './sections/Telemetry';
import { Circuits } from './sections/Circuits';
import { Weekend } from './sections/Weekend';
import { History } from './sections/History';
import { Drivers } from './sections/Drivers';
import { PitStops } from './sections/PitStops';
import { Gallery } from './sections/Gallery';
import { SiteFooter } from './sections/Footer';

/** Adds the active quality preset to <html> so CSS can adapt to it. */
function QualityAttribute() {
  const { preset } = useQuality();
  useEffect(() => {
    document.documentElement.dataset.quality = preset;
  }, [preset]);
  return null;
}

export function App() {
  return (
    <QualityProvider>
      <QualityAttribute />
      <a className="skip-link" href="#showcase">
        Skip to the car
      </a>
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <SiteHeader />
      <main id="main">
        <Opening />
        <Showcase />
        <Laboratory />
        <Race />
        <GrandPrix />
        <Telemetry />
        <Circuits />
        <Weekend />
        <History />
        <Drivers />
        <PitStops />
        <Gallery />
      </main>
      <SiteFooter />
    </QualityProvider>
  );
}
