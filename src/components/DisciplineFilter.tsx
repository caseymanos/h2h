import { cn } from '@/lib/utils';

interface Props {
  disciplines: string[];
  selected: string | null;
  onSelect: (discipline: string | null) => void;
}

export function DisciplineFilter({ disciplines, selected, onSelect }: Props) {
  if (disciplines.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2 animate-fade-in">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'badge transition-colors cursor-pointer',
          selected === null
            ? 'bg-accent/20 text-accent'
            : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
        )}
      >
        All Events
      </button>
      {disciplines.map((d) => (
        <button
          key={d}
          onClick={() => onSelect(d === selected ? null : d)}
          className={cn(
            'badge transition-colors cursor-pointer',
            selected === d
              ? 'bg-accent/20 text-accent'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
          )}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
