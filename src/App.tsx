import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AthleteSearch } from '@/components/AthleteSearch';
import { RecordSummary } from '@/components/RecordSummary';
import { DisciplineFilter } from '@/components/DisciplineFilter';
import { MatchupTable } from '@/components/MatchupTable';
import { MissingRaceButton } from '@/components/MissingRaceButton';
import { EmptyState } from '@/components/EmptyState';
import { useAthleteResults } from '@/hooks/useAthleteResults';
import { useHeadToHead } from '@/hooks/useHeadToHead';
import type { SelectedAthlete } from '@/lib/types';

function parseHash(): { a: number | null; b: number | null; d: string | null } {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const a = params.get('a');
  const b = params.get('b');
  const d = params.get('d');
  return {
    a: a ? parseInt(a, 10) : null,
    b: b ? parseInt(b, 10) : null,
    d: d || null,
  };
}

export default function App() {
  const [athleteA, setAthleteA] = useState<SelectedAthlete | null>(null);
  const [athleteB, setAthleteB] = useState<SelectedAthlete | null>(null);
  const [disciplineFilter, setDisciplineFilter] = useState<string | null>(null);

  // Sync state to hash
  const updateHash = useCallback(() => {
    const parts: string[] = [];
    if (athleteA) parts.push(`a=${athleteA.id}`);
    if (athleteB) parts.push(`b=${athleteB.id}`);
    if (disciplineFilter) parts.push(`d=${encodeURIComponent(disciplineFilter)}`);
    window.location.hash = parts.length > 0 ? parts.join('&') : '';
  }, [athleteA, athleteB, disciplineFilter]);

  useEffect(() => {
    updateHash();
  }, [updateHash]);

  // Load from hash on mount (athlete names from search results will show IDs only — enhancement later)
  useEffect(() => {
    const { d } = parseHash();
    if (d) setDisciplineFilter(d);
  }, []);

  const resultsA = useAthleteResults(athleteA);
  const resultsB = useAthleteResults(athleteB);
  const record = useHeadToHead(resultsA.data, resultsB.data, disciplineFilter);

  const isLoading = resultsA.isLoading || resultsB.isLoading;
  const bothSelected = athleteA !== null && athleteB !== null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">
            H2H <span className="text-text-muted font-normal">Athletics</span>
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Search panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AthleteSearch
            label="Athlete A"
            selected={athleteA}
            onSelect={setAthleteA}
            onClear={() => {
              setAthleteA(null);
              setDisciplineFilter(null);
            }}
            color="a"
          />
          <AthleteSearch
            label="Athlete B"
            selected={athleteB}
            onSelect={setAthleteB}
            onClear={() => {
              setAthleteB(null);
              setDisciplineFilter(null);
            }}
            color="b"
          />
        </div>

        {/* Loading state */}
        {bothSelected && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            <span className="ml-2 text-text-secondary">Loading results...</span>
          </div>
        )}

        {/* Results */}
        {bothSelected && record && !isLoading && (
          <div className="space-y-6 animate-slide-in">
            <RecordSummary athleteA={athleteA!} athleteB={athleteB!} record={record} />

            <DisciplineFilter
              disciplines={record.disciplines.length > 0 ? record.disciplines : []}
              selected={disciplineFilter}
              onSelect={setDisciplineFilter}
            />

            <MatchupTable
              matchups={record.matchups}
              athleteA={athleteA!}
              athleteB={athleteB!}
            />

            <MissingRaceButton athleteA={athleteA!} athleteB={athleteB!} />
          </div>
        )}

        {/* Empty state */}
        {!bothSelected && <EmptyState />}
      </main>
    </div>
  );
}
