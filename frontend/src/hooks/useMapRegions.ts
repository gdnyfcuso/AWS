// 地图地区数据 Hook

import { useState, useEffect } from 'react';
import { RegionConfig, RegionDetail, RegionSearchResult, MapViewConfig } from '../types/map';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * 获取所有地区列表
 */
export async function fetchRegions(params?: { type?: string; parent_id?: string }): Promise<RegionConfig[]> {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.parent_id) queryParams.append('parent_id', params.parent_id);

  const response = await fetch(`${API_BASE}/map/regions?${queryParams}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch regions');
  }

  return data.regions;
}

/**
 * 获取指定地区的详细信息
 */
export async function fetchRegionDetail(regionId: string): Promise<RegionDetail | null> {
  const response = await fetch(`${API_BASE}/map/regions/${regionId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch region detail');
  }

  return data.region;
}

/**
 * 获取指定地区的子地区
 */
export async function fetchRegionChildren(regionId: string): Promise<RegionConfig[]> {
  const response = await fetch(`${API_BASE}/map/regions/${regionId}/children`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch region children');
  }

  return data.children;
}

/**
 * 获取从根到指定地区的路径
 */
export async function fetchRegionPath(regionId: string): Promise<RegionConfig[]> {
  const response = await fetch(`${API_BASE}/map/regions/${regionId}/path`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch region path');
  }

  return data.path;
}

/**
 * 搜索地区
 */
export async function searchRegions(query: string): Promise<RegionSearchResult[]> {
  const response = await fetch(`${API_BASE}/map/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to search regions');
  }

  return data.results;
}

/**
 * 获取所有城市
 */
export async function fetchCities(): Promise<RegionConfig[]> {
  const response = await fetch(`${API_BASE}/map/cities`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch cities');
  }

  return data.cities;
}

/**
 * 获取地图视图配置
 */
export async function fetchMapView(regionId: string): Promise<MapViewConfig | null> {
  const response = await fetch(`${API_BASE}/map/view?region_id=${regionId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch map view');
  }

  return data.view;
}

/**
 * 获取指定地区的3D地标建筑
 */
export async function fetchRegionLandmarks(regionId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE}/map/regions/${regionId}/landmarks`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch region landmarks');
  }

  return data.landmarks || [];
}

/**
 * Hook: 获取地区的3D地标
 */
export function useRegionLandmarks(regionId: string | null) {
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regionId) {
      setLandmarks([]);
      return;
    }

    const load = async () => {
      console.log('[useRegionLandmarks] Loading landmarks for:', regionId);
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRegionLandmarks(regionId);
        console.log('[useRegionLandmarks] Loaded landmarks:', data.length, 'items');
        setLandmarks(data);
      } catch (err) {
        console.error('[useRegionLandmarks] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load landmarks');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [regionId]);

  return { landmarks, loading, error };
}

/**
 * Hook: 获取所有地区
 */
export function useRegions(params?: { type?: string; parent_id?: string }) {
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRegions(params);
        setRegions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load regions');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params?.type, params?.parent_id]);

  return { regions, loading, error, refetch: () => load() };
}

/**
 * Hook: 获取地区详情
 */
export function useRegionDetail(regionId: string | null) {
  const [region, setRegion] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regionId) {
      setRegion(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRegionDetail(regionId);
        setRegion(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load region detail');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [regionId]);

  return { region, loading, error };
}

/**
 * Hook: 获取子地区
 */
export function useRegionChildren(regionId: string | null) {
  const [children, setChildren] = useState<RegionConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regionId) {
      setChildren([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRegionChildren(regionId);
        setChildren(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load region children');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [regionId]);

  return { children, loading, error };
}

/**
 * Hook: 获取所有城市
 */
export function useCities() {
  const [cities, setCities] = useState<RegionConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCities();
        setCities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cities');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { cities, loading, error };
}

/**
 * Hook: 搜索地区
 */
export function useRegionSearch() {
  const [results, setResults] = useState<RegionSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await searchRegions(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search regions');
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
}
