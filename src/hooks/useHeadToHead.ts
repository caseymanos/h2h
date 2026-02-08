import { useMemo } from 'react';
import type { AthleteResult, HeadToHeadRecord } from '@/lib/types';
import { buildHeadToHead } from '@/lib/matching';

export function useHeadToHead(
  resultsA: AthleteResult[] | undefined,
  resultsB: AthleteResult[] | undefined,
  disciplineFilter: string | null
): HeadToHeadRecord | null {
  return useMemo(() => {
    if (!resultsA || !resultsB) return null;

    const record = buildHeadToHead(resultsA, resultsB);

    if (!disciplineFilter) return record;

    const filtered = record.matchups.filter((m) => m.discipline === disciplineFilter);
    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    for (const m of filtered) {
      if (m.winner === 'a') winsA++;
      else if (m.winner === 'b') winsB++;
      else ties++;
    }

    return {
      ...record,
      winsA,
      winsB,
      ties,
      total: filtered.length,
      matchups: filtered,
    };
  }, [resultsA, resultsB, disciplineFilter]);
}
