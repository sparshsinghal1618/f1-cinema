// Section 07 — Race weekend.
//
// The countdown is the only live element: it reads the configured timestamp and
// real elapsed time, and switches to a concluded state once that moment has
// passed. Sessions, grid and classification are a clearly labelled demonstration
// dataset.

import { useEffect, useMemo, useState } from 'react';
import { Cloud, Droplets, Flag, Thermometer, Wind } from 'lucide-react';
import { SectionHeader, revealIndex, useRevealGroup } from '../components/ui';
import { CONDITIONS, DEMO_GRID, DEMO_RESULTS, NEXT_EVENT, WEEKEND, WEEKEND_NOTE } from '../data/raceWeekend';
import { CIRCUITS } from '../data/circuits';
import { pad } from '../lib/format';

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const delta = target - now;
  const total = Math.max(0, delta);
  return {
    delta,
    days: Math.floor(total / 86400000),
    hours: Math.floor((total / 3600000) % 24),
    minutes: Math.floor((total / 60000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

export function Weekend() {
  const target = useMemo(() => new Date(NEXT_EVENT.dateISO).getTime(), []);
  const countdown = useCountdown(target);
  const circuit = CIRCUITS.find((entry) => entry.id === WEEKEND.circuitId);
  const concluded = countdown.delta <= 0;

  const days = ['Friday', 'Saturday', 'Sunday'] as const;
  const panels = useRevealGroup<HTMLDivElement>(80);
  const dayList = useRevealGroup<HTMLDivElement>(90);

  return (
    <section className="section" id="weekend" aria-labelledby="weekend-title">
      <div className="shell section__head">
        <SectionHeader
          index="07"
          eyebrow="Demonstration dataset"
          title="Race Weekend"
          titleId="weekend-title"
          lede="How a weekend is structured, and how a live countdown behaves when the clock runs out. Everything except the countdown clock is fictional demonstration data."
        />
      </div>

      <div ref={panels.ref} className={`shell weekend ${panels.className}`} style={panels.style}>
        <div
          className={`weekend__countdown panel panel__pad${concluded ? ' is-concluded' : ''}`}
          style={revealIndex(0)}
        >
          <p className="mono">{NEXT_EVENT.title}</p>
          {concluded ? (
            <>
              <h3 className="display h3">Concluded</h3>
              <p className="copy">
                The configured timestamp has passed. The countdown has stopped rather than counting into negative time.
              </p>
            </>
          ) : (
            <>
              <div className="countdown" role="timer" aria-live="off">
                {[
                  { label: 'Days', value: countdown.days },
                  { label: 'Hours', value: countdown.hours },
                  { label: 'Minutes', value: countdown.minutes },
                  { label: 'Seconds', value: countdown.seconds },
                ].map((unit) => (
                  <div className="countdown__unit" key={unit.label}>
                    <span className="countdown__value">{pad(unit.value)}</span>
                    <span className="mono">{unit.label}</span>
                  </div>
                ))}
              </div>
              <p className="copy">
                Counting down to {new Date(NEXT_EVENT.dateISO).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}.
              </p>
            </>
          )}
          <p className="mono weekend__disclaimer">{NEXT_EVENT.timezoneNote}</p>
        </div>

        <div className="weekend__schedule panel panel__pad" style={revealIndex(1)}>
          <div className="weekend__schedule-head">
            <p className="mono">
              <Flag size={12} aria-hidden="true" /> {WEEKEND.title}
            </p>
            {circuit && <span className="mono">{circuit.name}</span>}
          </div>
          <div ref={dayList.ref} className={`weekend__days ${dayList.className}`} style={dayList.style}>
            {days.map((day, dayIndex) => {
              const sessions = WEEKEND.sessions.filter((session) => session.weekday === day);
              if (!sessions.length) return null;
              return (
                <div className="weekend__day" key={day} style={revealIndex(dayIndex)}>
                  <h3 className="mono">{day}</h3>
                  <ul>
                    {sessions.map((session) => (
                      <li key={session.id}>
                        <span className="weekend__session-time mono">{session.time}</span>
                        <span className="weekend__session-name">
                          <strong>{session.name}</strong>
                          <span className="mono">{session.note}</span>
                        </span>
                        <span className="mono weekend__session-duration">{session.duration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="weekend__conditions panel panel__pad" style={revealIndex(2)}>
          <p className="mono">{CONDITIONS.label}</p>
          <ul className="conditions">
            <li>
              <Thermometer size={14} aria-hidden="true" />
              <span className="mono">Air</span>
              <strong>{CONDITIONS.airTempC} °C</strong>
            </li>
            <li>
              <Thermometer size={14} aria-hidden="true" />
              <span className="mono">Track</span>
              <strong>{CONDITIONS.trackTempC} °C</strong>
            </li>
            <li>
              <Droplets size={14} aria-hidden="true" />
              <span className="mono">Humidity</span>
              <strong>{CONDITIONS.humidity} %</strong>
            </li>
            <li>
              <Wind size={14} aria-hidden="true" />
              <span className="mono">Wind</span>
              <strong>
                {CONDITIONS.windKph} km/h {CONDITIONS.windDir}
              </strong>
            </li>
            <li>
              <Cloud size={14} aria-hidden="true" />
              <span className="mono">Rain chance</span>
              <strong>{CONDITIONS.rainChance} %</strong>
            </li>
            <li>
              <span className="mono">Track state</span>
              <strong>{CONDITIONS.trackState}</strong>
            </li>
          </ul>
        </div>

        <div className="weekend__tables" style={revealIndex(3)}>
          <div className="panel panel__pad">
            <p className="mono">Qualifying — demonstration grid</p>
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Fictional starting grid</caption>
                <thead>
                  <tr>
                    <th scope="col">Pos</th>
                    <th scope="col">Driver</th>
                    <th scope="col">Team</th>
                    <th scope="col">Time</th>
                    <th scope="col">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_GRID.map((entry) => (
                    <tr key={`${entry.position}-${entry.name}`}>
                      <td className="mono">{pad(entry.position)}</td>
                      <td>
                        <span className="mono data-table__code">{entry.code}</span> {entry.name}
                      </td>
                      <td>{entry.team}</td>
                      <td className="mono">{entry.time}</td>
                      <td className="mono">{entry.gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel panel__pad">
            <p className="mono">Classification — demonstration result</p>
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Fictional race classification</caption>
                <thead>
                  <tr>
                    <th scope="col">Pos</th>
                    <th scope="col">Driver</th>
                    <th scope="col">Team</th>
                    <th scope="col">Time</th>
                    <th scope="col">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_RESULTS.map((entry) => (
                    <tr key={`${entry.position}-${entry.name}`}>
                      <td className="mono">{pad(entry.position)}</td>
                      <td>{entry.name}</td>
                      <td>{entry.team}</td>
                      <td className="mono">
                        {entry.time}
                        {entry.note && <span className="data-table__note"> · {entry.note}</span>}
                      </td>
                      <td className="mono">{entry.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="mono weekend__note" style={revealIndex(4)}>
          {WEEKEND_NOTE}
        </p>
      </div>
    </section>
  );
}
