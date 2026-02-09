import { useState } from 'react';
import { useAction } from 'convex/react';
import { Loader2, Plus, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/convexApi';
import type { SelectedAthlete, SupportedRace } from '@/lib/types';

const SUPPORTED_RACES: SupportedRace[] = [
  {
    key: 'chicago',
    label: 'Chicago Marathon',
    years: Array.from({ length: 2026 - 2015 }, (_, i) => 2025 - i),
  },
  {
    key: 'boston',
    label: 'Boston Marathon',
    years: Array.from({ length: 2026 - 2018 }, (_, i) => 2025 - i),
  },
  {
    key: 'london',
    label: 'London Marathon',
    years: [2025, 2024],
  },
];

interface Props {
  athleteA: SelectedAthlete;
  athleteB: SelectedAthlete;
}

type ScrapeStatus = 'idle' | 'loading' | 'success' | 'error';

export function MissingRaceButton({ athleteA, athleteB }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState(SUPPORTED_RACES[0].key);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedAthlete, setSelectedAthlete] = useState<'a' | 'b' | 'both'>('both');
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [message, setMessage] = useState('');

  const scrape = useAction(api.h2hActions.scrapeMarathonResults);

  async function handleScrape() {
    setStatus('loading');
    setMessage('');

    const athletes =
      selectedAthlete === 'both'
        ? [athleteA, athleteB]
        : selectedAthlete === 'a'
          ? [athleteA]
          : [athleteB];

    const results: string[] = [];

    for (const athlete of athletes) {
      try {
        const result = await scrape({
          athleteFirstName: athlete.firstname,
          athleteLastName: athlete.lastname,
          athleteWaId: athlete.id,
          raceKey: selectedRace,
          raceYear: selectedYear,
        });

        if (result.found) {
          results.push(
            `${athlete.firstname} ${athlete.lastname}: ${result.result.mark} (${ordinal(result.result.place)} place)`
          );
        } else {
          results.push(
            `${athlete.firstname} ${athlete.lastname}: not found`
          );
        }
      } catch (err: any) {
        results.push(`${athlete.firstname} ${athlete.lastname}: error — ${err.message}`);
      }
    }

    const allFound = results.every((r) => !r.includes('not found') && !r.includes('error'));
    setStatus(allFound ? 'success' : 'error');
    setMessage(results.join('\n'));
  }

  const race = SUPPORTED_RACES.find((r) => r.key === selectedRace)!;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add missing race result
      </button>
    );
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Scrape Missing Race Result</h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setStatus('idle');
            setMessage('');
          }}
          className="text-text-muted hover:text-text-primary text-xs"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Race</label>
          <select
            value={selectedRace}
            onChange={(e) => setSelectedRace(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded px-2 py-1.5 text-sm"
          >
            {SUPPORTED_RACES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="w-full bg-bg-tertiary border border-border rounded px-2 py-1.5 text-sm"
          >
            {race.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Athlete</label>
          <select
            value={selectedAthlete}
            onChange={(e) => setSelectedAthlete(e.target.value as 'a' | 'b' | 'both')}
            className="w-full bg-bg-tertiary border border-border rounded px-2 py-1.5 text-sm"
          >
            <option value="both">Both</option>
            <option value="a">{athleteA.lastname}</option>
            <option value="b">{athleteB.lastname}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleScrape}
          disabled={status === 'loading'}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-medium transition-colors',
            status === 'loading'
              ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover text-white'
          )}
        >
          {status === 'loading' ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scraping...
            </span>
          ) : (
            'Search & Add'
          )}
        </button>

        {status === 'success' && (
          <span className="flex items-center gap-1 text-sm text-positive">
            <Check className="w-3.5 h-3.5" /> Added
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1 text-sm text-warning">
            <AlertCircle className="w-3.5 h-3.5" /> Partial
          </span>
        )}
      </div>

      {message && (
        <pre className="text-xs text-text-secondary bg-bg-primary rounded p-2 whitespace-pre-wrap">
          {message}
        </pre>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  if (n === 0) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
