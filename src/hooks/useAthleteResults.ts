import { useQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { useMemo, useEffect, useRef } from 'react';
import { getAthleteResults } from '@/lib/api';
import { mergeResults } from '@/lib/matching';
import { api } from '@/lib/convexApi';
import type { AthleteResult, SelectedAthlete } from '@/lib/types';

export function useAthleteResults(athlete: SelectedAthlete | null) {
  const athleteId = athlete?.id ?? null;

  // Step 1: Check Convex cache (24hr TTL, cross-session persistence)
  const cachedResults = useConvexQuery(
    api.h2h.getCachedResults,
    athleteId ? { athleteId } : 'skip'
  );

  // Step 2: Fetch from World Athletics API — skip if Convex cache is valid
  const hasCachedData = cachedResults !== undefined && cachedResults !== null;
  const waQuery = useQuery({
    queryKey: ['athlete-results', athleteId],
    queryFn: () => getAthleteResults(athleteId!),
    enabled: athleteId !== null && !hasCachedData,
    staleTime: 10 * 60 * 1000,
  });

  // Step 3: Persist WA results to Convex cache after fetch
  const cacheResultsMutation = useConvexMutation(api.h2h.cacheResults);
  const cachedRef = useRef<number | null>(null);

  useEffect(() => {
    if (waQuery.data && athleteId && athlete && cachedRef.current !== athleteId) {
      cachedRef.current = athleteId;
      cacheResultsMutation({
        athleteId,
        athleteName: `${athlete.firstname} ${athlete.lastname}`,
        results: waQuery.data,
      });
    }
  }, [waQuery.data, athleteId, athlete, cacheResultsMutation]);

  // Use cached data or fresh WA data
  const waResults: AthleteResult[] | undefined = hasCachedData
    ? (cachedResults.results as AthleteResult[])
    : waQuery.data;

  // Step 4: Query scraped results from Convex by athlete name
  const athleteName = athlete
    ? `${athlete.firstname} ${athlete.lastname}`.toLowerCase()
    : '';
  const scrapedByName = useConvexQuery(
    api.h2h.getScrapedResults,
    athlete ? { athleteName } : 'skip'
  );

  // Step 5: Also query by WA ID (covers results linked by ID)
  const scrapedByWaId = useConvexQuery(
    api.h2h.getScrapedResultsByWaId,
    athleteId ? { athleteWaId: athleteId } : 'skip'
  );

  // Step 6: Merge all results, deduplicating
  const mergedData = useMemo(() => {
    if (!waResults) return undefined;

    // Combine scraped results from both queries, dedup by _id
    const allScraped = [...(scrapedByName ?? []), ...(scrapedByWaId ?? [])];
    const seen = new Set<string>();
    const uniqueScraped = allScraped.filter((r) => {
      if (seen.has(r._id)) return false;
      seen.add(r._id);
      return true;
    });

    if (uniqueScraped.length === 0) return waResults;
    return mergeResults(waResults, uniqueScraped as any);
  }, [waResults, scrapedByName, scrapedByWaId]);

  return {
    data: mergedData,
    isLoading: athleteId !== null && !hasCachedData && waQuery.isLoading,
    error: waQuery.error,
  };
}
