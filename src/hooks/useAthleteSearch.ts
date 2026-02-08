import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { searchAthletes } from '@/lib/api';

export function useAthleteSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['athlete-search', debouncedQuery],
    queryFn: () => searchAthletes(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  return { query, setQuery, results, isLoading };
}
