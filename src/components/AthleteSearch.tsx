import { useRef, useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useAthleteSearch } from '@/hooks/useAthleteSearch';
import type { SelectedAthlete, AthleteSearchResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  selected: SelectedAthlete | null;
  onSelect: (athlete: SelectedAthlete) => void;
  onClear: () => void;
  color: 'a' | 'b';
}

export function AthleteSearch({ label, selected, onSelect, onClear, color }: Props) {
  const { query, setQuery, results, isLoading } = useAthleteSearch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(athlete: AthleteSearchResult) {
    onSelect({
      id: athlete.id,
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      country: athlete.country,
    });
    setQuery('');
    setOpen(false);
  }

  const borderColor = color === 'a' ? 'border-athlete-a/50' : 'border-athlete-b/50';
  const ringColor = color === 'a' ? 'ring-athlete-a/30' : 'ring-athlete-b/30';

  if (selected) {
    return (
      <div className={cn('card flex items-center justify-between', borderColor)}>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className="text-lg font-semibold">
            {selected.firstname} {selected.lastname}
          </p>
          <p className="text-sm text-text-secondary">{selected.country}</p>
        </div>
        <button
          onClick={onClear}
          className="btn-ghost p-2 rounded-full"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</p>
      <div className={cn('relative', open && results.length > 0 && 'z-20')}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search athlete name..."
          className={cn('input pl-9', `focus:${ringColor}`)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-bg-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-scale-in">
          {results.slice(0, 8).map((athlete) => (
            <button
              key={athlete.id}
              onClick={() => handleSelect(athlete)}
              className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors flex items-center justify-between"
            >
              <span className="font-medium">
                {athlete.firstname} {athlete.lastname}
              </span>
              <span className="text-xs text-text-muted">{athlete.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
