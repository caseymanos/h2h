import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { filterResults } from '@/lib/matching';
import type { AthleteResult } from '@/lib/types';

interface Props {
  results: AthleteResult[];
  disciplineFilter: string | null;
  athleteName: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function placeLabel(place: number) {
  if (!place || place >= 999) return '–';
  return String(place);
}

export function AthleteResultsTable({ results, disciplineFilter, athleteName }: Props) {
  const filtered = useMemo(() => {
    let finals = filterResults(results);
    if (disciplineFilter) {
      finals = finals.filter((r) => r.discipline === disciplineFilter);
    }
    // Sort newest first
    return finals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [results, disciplineFilter]);

  const disciplines = useMemo(() => {
    const set = new Set<string>();
    for (const r of filterResults(results)) {
      set.add(r.discipline);
    }
    return Array.from(set).sort();
  }, [results]);

  if (filtered.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-text-muted">No finals found{disciplineFilter ? ` for ${disciplineFilter}` : ''}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Summary stats */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-2">{athleteName}</h3>
        <div className="flex gap-6 text-sm text-text-secondary">
          <span><span className="font-medium text-text-primary">{filtered.length}</span> finals</span>
          <span><span className="font-medium text-text-primary">{disciplines.length}</span> disciplines</span>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-left">
              <th className="py-3 px-3 font-medium">Date</th>
              <th className="py-3 px-3 font-medium">Competition</th>
              <th className="py-3 px-3 font-medium">Discipline</th>
              <th className="py-3 px-3 font-medium text-right">Place</th>
              <th className="py-3 px-3 font-medium text-right">Mark</th>
              <th className="py-3 px-3 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <motion.tr
                key={`${r.date}-${r.discipline}-${r.competition}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors"
              >
                <td className="py-3 px-3 whitespace-nowrap text-text-secondary">
                  {formatDate(r.date)}
                </td>
                <td className="py-3 px-3">{r.competition}</td>
                <td className="py-3 px-3 whitespace-nowrap font-medium">{r.discipline}</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  {placeLabel(r.place)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums font-medium">
                  {r.mark}
                </td>
                <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                  {r.location?.city || ''}
                  {r.location?.city && r.location?.country ? ', ' : ''}
                  {r.location?.country || ''}
                  {r.location?.indoor ? ' (I)' : ''}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
