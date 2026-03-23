// 获取地形数据的 Hook

import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

export interface TerrainFeature {
  id: string;
  feature_id: string;
  type: 'mountain' | 'hill' | 'water' | 'river' | 'plain' | 'forest';
  name?: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  real_coordinates?: { lat: number; lng: number };
  metadata?: Record<string, unknown>;
}

export interface TerrainRenderData {
  mountains: TerrainFeature[];
  hills: TerrainFeature[];
  rivers: TerrainFeature[];
  plains: TerrainFeature[];
}

export function useTerrainData(enabled = true) {
  const [data, setData] = useState<TerrainRenderData>({
    mountains: [],
    hills: [],
    rivers: [],
    plains: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(getApiUrl('/api/v1/world3d/terrain/render-data'));
        if (!response.ok) {
          throw new Error('Failed to fetch terrain data');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch terrain data');
        }
      } catch (err) {
        console.error('Error fetching terrain data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 每30秒刷新一次
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [enabled]);

  return { data, loading, error };
}
