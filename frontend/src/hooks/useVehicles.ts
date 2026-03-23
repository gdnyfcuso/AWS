// 获取车辆数据的 Hook

import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

export interface Vehicle {
  vehicle_id: string;
  name: string;
  type: 'car' | 'bus' | 'truck' | 'motorcycle' | 'bicycle' | 'taxi';
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  capacity: number;
  max_speed: number;
  color: string;
  status: 'parked' | 'moving' | 'stopped' | 'idle';
  current_driver_id?: string;
}

export function useVehicles(enabled = true) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(getApiUrl('/api/v1/world3d/vehicles'));
        if (!response.ok) {
          throw new Error('Failed to fetch vehicles');
        }

        const result = await response.json();
        if (result.success) {
          setVehicles(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch vehicles');
        }
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 每5秒刷新一次（车辆位置变化较快）
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [enabled]);

  return { vehicles, loading, error };
}
