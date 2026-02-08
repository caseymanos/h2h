import { useQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { useMemo } from 'react';
import { getAthleteResults } from '@/lib/api';
import { mergeResults } from '@/lib/matching';
import { api } from '@/lib/convexApi';
import type { AthleteResult, SelectedAthlete } from '@/lib/types';

export function useAthleteResults(athlete: SelectedAthlete | null) {
  const athleteId = athlete?.id ?? null;

  // Step 1: Fetch from World Athletics API (existing behavior)
  const waQuery = useQuery({
    queryKey: ['athlete-results', athleteId],
    queryFn: () => getAthleteResults(athleteId!),
    enabled: athleteId !== null,
    staleTime: 10 * 60 * 1000,
  });

  // Step 2: Query scraped results from Convex by athlete name
  const athleteName = athlete
    ? `${athlete.firstname} ${athlete.lastname}`.toLowerCase()
    : '';
  const scrapedByName = useConvexQuery(
    api.h2h.getScrapedResults,
    athlete ? { athleteName } : 'skip'
  );

  // Step 3: Also query by WA ID (covers results linked by ID)
  const scrapedByWaId = useConvexQuery(
    api.h2h.getScrapedResultsByWaId,
    athleteId ? { athleteWaId: athleteId } : 'skip'
  );

  // Step 4: Merge all results, deduplicating
  const mergedData = useMemo(() => {
    if (!waQuery.data) return undefined;

    // Combine scraped results from both queries, dedup by _id
    const allScraped = [...(scrapedByName ?? []), ...(scrapedByWaId ?? [])];
    const seen = new Set<string>();
    const uniqueScraped = allScraped.filter((r) => {
      if (seen.has(r._id)) return false;
      seen.add(r._id);
      return true;
    });

    if (uniqueScraped.length === 0) return waQuery.data;
    return mergeResults(waQuery.data, uniqueScraped as any);
  }, [waQuery.data, scrapedByName, scrapedByWaId]);

  return {
    data: mergedData,
    isLoading: waQuery.isLoading,
    error: waQuery.error,
  };
}
