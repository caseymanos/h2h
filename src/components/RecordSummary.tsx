import { motion } from 'framer-motion';
import type { SelectedAthlete, HeadToHeadRecord } from '@/lib/types';
import { AthleteCard } from './AthleteCard';

interface Props {
  athleteA: SelectedAthlete;
  athleteB: SelectedAthlete;
  record: HeadToHeadRecord;
}

export function RecordSummary({ athleteA, athleteB, record }: Props) {
  const total = record.winsA + record.winsB + record.ties;
  const pctA = total > 0 ? (record.winsA / total) * 100 : 50;
  const pctB = total > 0 ? (record.winsB / total) * 100 : 50;
  const pctTie = total > 0 ? (record.ties / total) * 100 : 0;

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <AthleteCard athlete={athleteA} wins={record.winsA} color="a" />

        <div className="text-center px-4">
          <p className="text-sm text-text-muted mb-1">Head-to-Head</p>
          <p className="text-2xl font-bold font-mono tabular-nums">
            {record.winsA} – {record.winsB}
          </p>
          {record.ties > 0 && (
            <p className="text-xs text-text-muted mt-1">
              {record.ties} {record.ties === 1 ? 'tie' : 'ties'}
            </p>
          )}
          <p className="text-xs text-text-muted mt-1">
            {record.total} {record.total === 1 ? 'race' : 'races'}
          </p>
        </div>

        <AthleteCard athlete={athleteB} wins={record.winsB} color="b" />
      </div>

      {/* Tug-of-war bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-bg-tertiary">
        <motion.div
          className="bg-athlete-a rounded-l-full"
          initial={{ width: 0 }}
          animate={{ width: `${pctA}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {pctTie > 0 && (
          <motion.div
            className="bg-text-muted/40"
            initial={{ width: 0 }}
            animate={{ width: `${pctTie}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          />
        )}
        <motion.div
          className="bg-athlete-b rounded-r-full"
          initial={{ width: 0 }}
          animate={{ width: `${pctB}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}
