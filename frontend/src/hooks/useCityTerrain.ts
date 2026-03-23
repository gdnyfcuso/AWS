/**
 * 获取城市级地形数据的 Hook
 * 根据 Agent 所在城市或坐标加载对应的地形数据
 * 1:1 比例配置: 1虚拟单位 = 1米
 */

import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

export interface TerrainFeature {
  id: string;
  feature_id: string;
  type: 'mountain' | 'hill' | 'water' | 'river' | 'plain' | 'forest' | 'ocean';
  name?: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  real_coordinates?: { lat: number; lng: number };
  metadata?: Record<string, unknown>;
}

export interface CityConfig {
  id: string;
  name: string;
  name_en: string;
  country: string;
  province?: string;
  center: { lat: number; lng: number };
}

export interface CityTerrainData {
  city: CityConfig | null;
  mountains: TerrainFeature[];
  hills: TerrainFeature[];
  rivers: TerrainFeature[];
  plains: TerrainFeature[];
  waters: TerrainFeature[];
}

export interface UseCityTerrainOptions {
  enabled?: boolean;
  refreshInterval?: number; // 毫秒
}

/**
 * 根据 Agent ID 获取城市地形数据
 */
export function useCityTerrainByAgent(
  agentId: string | null,
  options: UseCityTerrainOptions = {}
) {
  const { enabled = true, refreshInterval = 30000 } = options;
  const [data, setData] = useState<CityTerrainData>({
    city: null,
    mountains: [],
    hills: [],
    rivers: [],
    plains: [],
    waters: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !agentId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(
          getApiUrl(`/api/v1/cities/agent/${agentId}/terrain`)
        );

        if (!response.ok) {
          throw new Error('Failed to fetch city terrain data');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch city terrain data');
        }
      } catch (err) {
        console.error('Error fetching city terrain data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, agentId, refreshInterval]);

  return { data, loading, error };
}

/**
 * 根据城市名称获取地形数据
 */
export function useCityTerrainByName(
  cityName: string | null,
  options: UseCityTerrainOptions = {}
) {
  const { enabled = true, refreshInterval = 30000 } = options;
  const [data, setData] = useState<CityTerrainData>({
    city: null,
    mountains: [],
    hills: [],
    rivers: [],
    plains: [],
    waters: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !cityName) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // 标准化城市名称
        const normalizedCityName = cityName.toLowerCase().replace(/市$/, '');
        const response = await fetch(
          getApiUrl(`/api/v1/cities/${normalizedCityName}/terrain`)
        );

        if (!response.ok) {
          throw new Error('Failed to fetch city terrain data');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch city terrain data');
        }
      } catch (err) {
        console.error('Error fetching city terrain data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, cityName, refreshInterval]);

  return { data, loading, error };
}

/**
 * 根据经纬度获取地形数据
 */
export function useCityTerrainByCoords(
  lat: number | null,
  lng: number | null,
  options: UseCityTerrainOptions = {}
) {
  const { enabled = true, refreshInterval = 30000 } = options;
  const [data, setData] = useState<CityTerrainData>({
    city: null,
    mountains: [],
    hills: [],
    rivers: [],
    plains: [],
    waters: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || lat === null || lng === null) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(
          getApiUrl(`/api/v1/cities/coordinates/terrain?lat=${lat}&lng=${lng}`)
        );

        if (!response.ok) {
          throw new Error('Failed to fetch city terrain data');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch city terrain data');
        }
      } catch (err) {
        console.error('Error fetching city terrain data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, lat, lng, refreshInterval]);

  return { data, loading, error };
}

/**
 * 获取所有城市列表
 */
export function useCities(enabled = true) {
  const [cities, setCities] = useState<CityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchCities = async () => {
      try {
        const response = await fetch(getApiUrl('/api/v1/cities'));

        if (!response.ok) {
          throw new Error('Failed to fetch cities');
        }

        const result = await response.json();
        if (result.success) {
          setCities(result.data);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch cities');
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, [enabled]);

  return { cities, loading, error };
}
