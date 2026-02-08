import type { SelectedAthlete } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  athlete: SelectedAthlete;
  wins: number;
  color: 'a' | 'b';
}

export function AthleteCard({ athlete, wins, color }: Props) {
  const textColor = color === 'a' ? 'text-athlete-a' : 'text-athlete-b';

  return (
    <div className="text-center">
      <p className={cn('text-4xl font-bold font-mono tabular-nums', textColor)}>{wins}</p>
      <p className="text-lg font-semibold mt-1">
        {athlete.firstname} {athlete.lastname}
      </p>
      <p className="text-sm text-text-muted">{athlete.country}</p>
    </div>
  );
}
