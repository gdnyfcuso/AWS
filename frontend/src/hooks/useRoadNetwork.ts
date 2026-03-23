// 获取道路网络数据的 Hook

import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

export interface Road {
  road_id: string;
  name: string;
  name_en?: string;
  type: 'highway' | 'main_road' | 'secondary_road' | 'alley' | 'ring_road';
  width: number;
  lanes: number;
  speed_limit: number;
  path: { x: number; y: number; z: number }[];
  has_lane_markings?: boolean;
}

export interface Intersection {
  id: string;
  position: { x: number; y: number; z: number };
  roads: string[];
  is_traffic_controlled: boolean;
}

export interface RoadNetworkData {
  roads: Road[];
  intersections: Intersection[];
}

export function useRoadNetwork(enabled = true) {
  const [data, setData] = useState<RoadNetworkData>({
    roads: [],
    intersections: [],
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
        const response = await fetch(getApiUrl('/api/v1/world3d/roads/network'));
        if (!response.ok) {
          throw new Error('Failed to fetch road network');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch road network');
        }
      } catch (err) {
        console.error('Error fetching road network:', err);
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
