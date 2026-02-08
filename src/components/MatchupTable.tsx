import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Matchup, SelectedAthlete } from '@/lib/types';

interface Props {
  matchups: Matchup[];
  athleteA: SelectedAthlete;
  athleteB: SelectedAthlete;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function placeLabel(place: number) {
  if (place >= 999) return '–';
  return String(place);
}

export function MatchupTable({ matchups, athleteA, athleteB }: Props) {
  if (matchups.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-text-muted">No shared finals found for this filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-muted text-left">
            <th className="py-3 px-3 font-medium">Date</th>
            <th className="py-3 px-3 font-medium">Event</th>
            <th className="py-3 px-3 font-medium">Competition</th>
            <th className="py-3 px-3 font-medium text-right">
              {athleteA.lastname}
            </th>
            <th className="py-3 px-3 font-medium text-right">
              {athleteB.lastname}
            </th>
            <th className="py-3 px-3 font-medium">Winner</th>
          </tr>
        </thead>
        <tbody>
          {matchups.map((m, i) => (
            <motion.tr
              key={`${m.date}-${m.discipline}-${m.competition}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              className={cn(
                'border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors',
                m.winner === 'a' && 'bg-athlete-a/5',
                m.winner === 'b' && 'bg-athlete-b/5'
              )}
            >
              <td className="py-3 px-3 whitespace-nowrap text-text-secondary">
                {formatDate(m.date)}
              </td>
              <td className="py-3 px-3 whitespace-nowrap font-medium">{m.discipline}</td>
              <td className="py-3 px-3">
                <span>{m.competition}</span>
                {m.venue && (
                  <span className="text-text-muted ml-1">
                    · {m.venue}
                    {m.indoor && ' (I)'}
                  </span>
                )}
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums">
                <span className={cn(m.winner === 'a' && 'text-athlete-a font-semibold')}>
                  {m.athleteA.mark}
                </span>
                <span className="text-text-muted ml-1 text-xs">
                  ({placeLabel(m.athleteA.place)})
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums">
                <span className={cn(m.winner === 'b' && 'text-athlete-b font-semibold')}>
                  {m.athleteB.mark}
                </span>
                <span className="text-text-muted ml-1 text-xs">
                  ({placeLabel(m.athleteB.place)})
                </span>
              </td>
              <td className="py-3 px-3">
                {m.winner === 'a' && (
                  <span className="text-athlete-a font-medium">{athleteA.lastname}</span>
                )}
                {m.winner === 'b' && (
                  <span className="text-athlete-b font-medium">{athleteB.lastname}</span>
                )}
                {m.winner === 'tie' && <span className="text-text-muted">Tie</span>}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
