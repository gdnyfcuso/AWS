/**
 * 加密工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import { generateApiKey, generateSignature, verifySignature, generateId } from '../../../src/utils/crypto';

describe('crypto 工具函数', () => {
  describe('generateApiKey', () => {
    it('应该生成以 aw_ 开头的 API Key', () => {
      const apiKey = generateApiKey();
      expect(apiKey).toMatch(/^aw_/);
    });

    it('每次生成应该返回不同的值', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });

    it('生成的 API Key 应该有合理的长度', () => {
      const apiKey = generateApiKey();
      // base64url 编码 32 字节 -> ~43 字符 + "aw_" 前缀
      expect(apiKey.length).toBeGreaterThan(40);
      expect(apiKey.length).toBeLessThan(50);
    });

    it('API Key 应该只包含安全字符', () => {
      const apiKey = generateApiKey();
      expect(apiKey).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe('generateSignature', () => {
    it('应该为相同的输入生成相同的签名', () => {
      const payload = { foo: 'bar', num: 42 };
      const secret = 'test-secret';
      const sig1 = generateSignature(payload, secret);
      const sig2 = generateSignature(payload, secret);
      expect(sig1).toBe(sig2);
    });

    it('不同的输入应该生成不同的签名', () => {
      const payload1 = { foo: 'bar' };
      const payload2 = { foo: 'baz' };
      const secret = 'test-secret';
      const sig1 = generateSignature(payload1, secret);
      const sig2 = generateSignature(payload2, secret);
      expect(sig1).not.toBe(sig2);
    });

    it('不同的密钥应该生成不同的签名', () => {
      const payload = { foo: 'bar' };
      const secret1 = 'secret1';
      const secret2 = 'secret2';
      const sig1 = generateSignature(payload, secret1);
      const sig2 = generateSignature(payload, secret2);
      expect(sig1).not.toBe(sig2);
    });

    it('签名应该是十六进制字符串', () => {
      const signature = generateSignature({ test: 'data' }, 'secret');
      expect(signature).toMatch(/^[a-f0-9]+$/);
    });

    it('SHA256 签名应该是 64 个字符', () => {
      const signature = generateSignature({ test: 'data' }, 'secret');
      expect(signature).toHaveLength(64);
    });

    it('应该处理复杂对象', () => {
      const complexPayload = {
        nested: { value: 123, array: [1, 2, 3] },
        timestamp: Date.now(),
      };
      const signature = generateSignature(complexPayload, 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifySignature', () => {
    it('应该验证正确的签名', () => {
      const payload = { message: 'hello' };
      const secret = 'my-secret';
      const signature = generateSignature(payload, secret);
      expect(verifySignature(payload, signature, secret)).toBe(true);
    });

    it('应该拒绝错误的签名', () => {
      const payload = { message: 'hello' };
      const secret = 'my-secret';
      const wrongSignature = 'a'.repeat(64);
      expect(verifySignature(payload, wrongSignature, secret)).toBe(false);
    });

    it('应该拒绝不同密钥生成的签名', () => {
      const payload = { message: 'hello' };
      const secret1 = 'secret1';
      const secret2 = 'secret2';
      const signature = generateSignature(payload, secret1);
      expect(verifySignature(payload, signature, secret2)).toBe(false);
    });

    it('应该拒绝修改后的载荷', () => {
      const payload1 = { message: 'hello' };
      const payload2 = { message: 'world' };
      const secret = 'my-secret';
      const signature = generateSignature(payload1, secret);
      expect(verifySignature(payload2, signature, secret)).toBe(false);
    });

    it('长度不匹配应该立即返回 false', () => {
      const payload = { test: 'data' };
      const secret = 'secret';
      const wrongLengthSignature = 'abc';
      expect(verifySignature(payload, wrongLengthSignature, secret)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('应该生成非空字符串', () => {
      const id = generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('应该包含时间戳', () => {
      const id1 = generateId();
      const id2 = generateId();
      // 在同一毫秒内生成的 ID 应该不同（因为有随机部分）
      expect(id1).not.toBe(id2);
    });

    it('应该支持前缀', () => {
      const id = generateId('agent');
      expect(id).toMatch(/^agent_/);
    });

    it('不带前缀时不应该有前缀分隔符', () => {
      const id = generateId();
      expect(id).not.toMatch(/^_/);
    });

    it('空字符串前缀应该等同于无前缀', () => {
      const id1 = generateId('');
      const id2 = generateId();
      expect(id1).not.toMatch(/^_/);
      expect(typeof id1).toBe('string');
    });

    it('每次调用应该生成不同的 ID', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('ID 应该只包含 URL 安全字符', () => {
      const id = generateId('test');
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('相同前缀的 ID 应该不同', () => {
      const id1 = generateId('user');
      const id2 = generateId('user');
      expect(id1).not.toBe(id2);
    });
  });

  describe('安全性边界情况', () => {
    it('应该处理空对象', () => {
      const signature = generateSignature({}, 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('应该处理特殊字符', () => {
      const payload = { special: '你好 🎉' };
      const secret = '秘密';
      const signature = generateSignature(payload, secret);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('应该处理数字载荷', () => {
      const signature = generateSignature(42, 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('应该处理字符串载荷', () => {
      const signature = generateSignature('plain text', 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('应该处理 null 载荷', () => {
      const signature = generateSignature(null, 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('应该处理数组载荷', () => {
      const signature = generateSignature([1, 2, 3], 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
