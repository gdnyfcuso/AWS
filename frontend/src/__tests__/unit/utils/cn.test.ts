/**
 * cn 工具函数测试
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../../../utils/cn';

describe('cn', () => {
  it('应该合并多个类名', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('应该处理条件类名', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
  });

  it('应该处理对象形式的条件类名', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('应该处理数组形式的类名', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('应该过滤掉 falsy 值', () => {
    expect(cn('foo', false, null, undefined, 0, '', 'bar')).toBe('foo bar');
  });

  it('应该合并 Tailwind 冲突类名', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('应该处理复杂的 Tailwind 类名组合', () => {
    expect(cn('text-sm font-bold', 'text-lg', 'text-red-500')).toBe('font-bold text-lg text-red-500');
  });

  it('应该处理空输入', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null, undefined)).toBe('');
  });

  it('应该处理数字输入', () => {
    expect(cn(1, 2, 3)).toBe('1 2 3');
  });

  it('应该处理混合输入类型', () => {
    expect(
      cn(
        'base-class',
        { conditional: true, 'not-conditional': false },
        ['array-class-1', 'array-class-2'],
        true && 'true-class',
        false && 'false-class'
      )
    ).toBe('base-class conditional array-class-1 array-class-2 true-class');
  });

  it('应该保留相同的非 Tailwind 类名 (clsx 行为)', () => {
    // clsx + twMerge 不去重非 Tailwind 类名，这是预期行为
    expect(cn('foo', 'bar', 'foo')).toBe('foo bar foo');
  });

  it('应该处理特殊字符和 Tailwind 变体', () => {
    expect(cn('hover:bg-blue-500', 'focus:bg-red-500', 'active:bg-green-500')).toBe(
      'hover:bg-blue-500 focus:bg-red-500 active:bg-green-500'
    );
  });

  it('应该正确处理 Tailwind 的响应式类名', () => {
    expect(cn('p-4', 'md:p-6', 'lg:p-8')).toBe('p-4 md:p-6 lg:p-8');
  });

  it('应该处理深嵌套的对象条件', () => {
    expect(cn({
      'class-a': true,
      'class-b': false,
      'class-c': 'truthy' as any,
    })).toBe('class-a class-c');
  });
});
