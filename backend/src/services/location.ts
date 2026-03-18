// IP 地址位置服务

import { createLogger } from '../utils/logger';

const logger = createLogger('LocationService');

export interface IPLocation {
  ip: string;
  country: string;
  country_code: string;
  city: string;
  region: string;
  latitude: number;
  longitude: string;
  timezone?: string;
}

/**
 * 从 IP 地址获取位置信息
 * 使用免费的 ip-api.com 服务
 */
export async function getLocationFromIP(ip?: string): Promise<IPLocation | null> {
  try {
    const url = ip
      ? `http://ip-api.com/json/${ip}`
      : 'http://ip-api.com/json/';

    const response = await fetch(url);
    if (!response.ok) {
      logger.warn('IP API request failed');
      return null;
    }

    const data = await response.json();

    if (data.status === 'fail') {
      logger.warn('IP lookup failed:', data.message);
      return null;
    }

    return {
      ip: data.query,
      country: data.country,
      country_code: data.countryCode,
      city: data.city,
      region: data.regionName,
      latitude: data.lat,
      longitude: data.lon as string,
      timezone: data.timezone,
    };
  } catch (error) {
    logger.error('Error getting location from IP', error);
    return null;
  }
}

/**
 * 获取客户端真实 IP 地址（考虑代理）
 */
export function getClientIP(request: { ip?: string; headers: { [key: string]: string | undefined } }): string {
  // 检查各种可能的 IP 头
  const forwardedFor = request.headers['x-forwarded-for'];
  const realIP = request.headers['x-real-ip'];
  const cfConnectingIP = request.headers['cf-connecting-ip'];

  if (forwardedFor) {
    // x-forwarded-for 可能包含多个 IP，取第一个
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return request.ip || 'unknown';
}

/**
 * 生成默认位置（当无法获取真实位置时）
 */
export function getDefaultLocation(): IPLocation {
  return {
    ip: 'unknown',
    country: '中国',
    country_code: 'CN',
    city: '北京',
    region: '北京',
    latitude: 39.9042,
    longitude: '116.4074',
    timezone: 'Asia/Shanghai',
  };
}
