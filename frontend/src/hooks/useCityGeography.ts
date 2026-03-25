// 城市地理数据 Hook - 按城市加载真实的道路、地标、河流

import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

/**
 * 获取城市的完整3D地理数据
 */
export async function fetchCityGeography(cityId: string): Promise<any> {
  const response = await fetch(getApiUrl(`/api/v1/map/cities/${cityId}/geography`));
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch city geography');
  }

  return data;
}

/**
 * Hook: 获取城市的3D地理数据
 */
export function useCityGeography(cityId: string | null) {
  const [geography, setGeography] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cityId) {
      setGeography(null);
      return;
    }

    const load = async () => {
      console.log('[useCityGeography] Loading geography for city:', cityId);
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCityGeography(cityId);
        console.log('[useCityGeography] Loaded geography:', {
          city: data.city?.name,
          roadsCount: data.roads?.length || 0,
          landmarksCount: data.landmarks?.length || 0,
          riversCount: data.rivers?.length || 0,
        });
        setGeography(data);
      } catch (err) {
        console.error('[useCityGeography] Error loading city data:', err);
        console.error('[useCityGeography] Error details:', {
          cityId,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        setError(err instanceof Error ? err.message : 'Failed to load city geography');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [cityId]);

  return { geography, loading, error };
}
