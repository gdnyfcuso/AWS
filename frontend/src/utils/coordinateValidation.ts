/**
 * 坐标系统验证工具
 * 用于检测和警告坐标比例不一致的问题
 */

import type { VirtualCoordinates, CityConfig } from './coordinates';

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  details: {
    coordinateScale: number;  // 检测到的坐标比例
    expectedScale: number;    // 期望的比例 (1.0)
    maxCoordinate: number;    // 最大坐标值
    citySize: number;         // 城市大小（米）
  };
}

/**
 * 检测坐标数据的比例
 * 通过分析坐标值的范围来判断是否使用了正确的1:1比例
 *
 * @param coordinates 坐标数组
 * @param cityConfig 城市配置
 * @returns 验证结果
 */
export function detectCoordinateScale(
  coordinates: VirtualCoordinates[],
  cityConfig: CityConfig
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (coordinates.length === 0) {
    return {
      isValid: false,
      warnings: [],
      errors: ['没有坐标数据可供验证'],
      details: {
        coordinateScale: 0,
        expectedScale: 1.0,
        maxCoordinate: 0,
        citySize: 0,
      },
    };
  }

  // 计算坐标范围
  const xValues = coordinates.map(c => Math.abs(c.x));
  const zValues = coordinates.map(c => Math.abs(c.z));
  const maxAbsX = Math.max(...xValues);
  const maxAbsZ = Math.max(...zValues);
  const maxCoordinate = Math.max(maxAbsX, maxAbsZ);

  // 计算城市的近似大小（米）
  const cityWidth = (cityConfig.bounds.maxLng - cityConfig.bounds.minLng) * 111000 *
    Math.cos(cityConfig.center.lat * Math.PI / 180);
  const cityDepth = (cityConfig.bounds.maxLat - cityConfig.bounds.minLat) * 111000;
  const citySize = Math.max(cityWidth, cityDepth);

  // 检测坐标比例
  // 如果最大坐标远小于城市大小，说明使用了缩小的比例
  let detectedScale = 1.0;
  if (maxCoordinate > 0) {
    // 假设坐标应该覆盖城市的大部分（至少50%）
    const expectedMinMax = citySize * 0.5;
    if (maxCoordinate < expectedMinMax * 0.01) {
      // 坐标范围太小，可能使用了1:10000或类似的比例
      detectedScale = maxCoordinate / expectedMinMax;
    }
  }

  // 验证规则
  const isValid = detectedScale >= 0.1; // 允许10%的误差

  // 生成警告和错误
  if (!isValid) {
    errors.push(`坐标比例异常: 检测到 ${detectedScale.toFixed(4)}:1 的比例，期望 1:1`);
    errors.push(`最大坐标: ${maxCoordinate.toFixed(0)}m，城市大小: ${citySize.toFixed(0)}m`);
  }

  if (maxCoordinate < 1000) {
    warnings.push(`坐标范围较小 (${maxCoordinate.toFixed(0)}m)，对于城市级别的场景可能需要更大的范围`);
  }

  if (maxCoordinate > citySize * 2) {
    warnings.push(`坐标范围超过城市大小的2倍，可能包含城市外部的数据`);
  }

  // 检查是否有明显的网格化坐标（整数/100的倍数）
  const hasGridCoordinates = coordinates.some(c =>
    (c.x % 100 === 0 || c.z % 100 === 0) && (c.x !== 0 || c.z !== 0)
  );
  if (hasGridCoordinates && maxCoordinate < 10000) {
    warnings.push(`检测到可能的网格化坐标，可能不是真实的地理位置`);
  }

  return {
    isValid,
    warnings,
    errors,
    details: {
      coordinateScale: detectedScale,
      expectedScale: 1.0,
      maxCoordinate,
      citySize,
    },
  };
}

/**
 * 验证单个坐标是否在合理范围内
 */
export function validateCoordinate(
  coord: VirtualCoordinates,
  cityConfig: CityConfig
): { isValid: boolean; reason?: string } {
  // 计算城市边界
  const cityWidth = (cityConfig.bounds.maxLng - cityConfig.bounds.minLng) * 111000 *
    Math.cos(cityConfig.center.lat * Math.PI / 180);
  const cityDepth = (cityConfig.bounds.maxLat - cityConfig.bounds.minLat) * 111000;

  const halfWidth = cityWidth / 2;
  const halfDepth = cityDepth / 2;

  // 允许一定的边界外范围（20%）
  const tolerance = 1.2;

  if (Math.abs(coord.x) > halfWidth * tolerance) {
    return {
      isValid: false,
      reason: `X坐标 ${coord.x} 超出城市范围 (±${(halfWidth * tolerance).toFixed(0)}m)`,
    };
  }

  if (Math.abs(coord.z) > halfDepth * tolerance) {
    return {
      isValid: false,
      reason: `Z坐标 ${coord.z} 超出城市范围 (±${(halfDepth * tolerance).toFixed(0)}m)`,
    };
  }

  return { isValid: true };
}

/**
 * 打印验证结果到控制台
 */
export function logValidationResult(
  result: ValidationResult,
  context: string = 'Coordinate Validation'
): void {
  const style = {
    title: 'font-weight: bold; font-size: 12px;',
    success: 'color: #22c55e;',
    warning: 'color: #f59e0b;',
    error: 'color: #ef4444;',
    info: 'color: #3b82f6;',
  };

  console.log(`%c[${context}]`, style.title + style.info);

  if (result.isValid) {
    console.log(`%c✓ 坐标系统验证通过`, style.success);
  } else {
    console.log(`%c✗ 坐标系统验证失败`, style.error);
  }

  console.log(`  检测到的比例: ${result.details.coordinateScale.toFixed(4)}:1`);
  console.log(`  期望的比例: ${result.details.expectedScale}:1`);
  console.log(`  最大坐标值: ${result.details.maxCoordinate.toFixed(0)}m`);
  console.log(`  城市大小: ${result.details.citySize.toFixed(0)}m`);

  if (result.warnings.length > 0) {
    console.log(`%c  警告:`, style.warning);
    result.warnings.forEach(w => console.log(`    - ${w}`));
  }

  if (result.errors.length > 0) {
    console.log(`%c  错误:`, style.error);
    result.errors.forEach(e => console.log(`    - ${e}`));
  }
}

/**
 * 创建一个开发模式下的坐标验证 Hook
 */
export function useCoordinateValidator(cityConfig: CityConfig | null) {
  return (coordinates: VirtualCoordinates[], context?: string) => {
    if (!cityConfig || import.meta.env.MODE !== 'development') {
      return;
    }

    const result = detectCoordinateScale(coordinates, cityConfig);
    logValidationResult(result, context || 'Coordinate Validation');

    // 在开发模式下，如果检测到严重问题，在控制台显示提示
    if (!result.isValid && result.errors.length > 0) {
      console.group('%c🚨 坐标系统问题检测', 'color: #ef4444; font-weight: bold; font-size: 14px;');
      console.warn('检测到坐标比例不匹配！');
      console.warn('这可能导致3D场景中的物体位置不正确。');
      console.warn('请检查:');
      console.warn('  1. 是否使用了正确的坐标转换函数 (latLngToMeters)');
      console.warn('  2. 虚拟空间尺寸是否与城市实际范围匹配');
      console.warn('  3. 建筑和Agent的坐标是否使用相同的比例');
      console.groupEnd();
    }
  };
}
