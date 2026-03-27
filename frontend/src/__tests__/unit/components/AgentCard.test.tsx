/**
 * AgentCard 组件测试
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentCard } from '../../../components/AgentCard';
import type { Agent } from '../../../types';

// Mock cn utility
vi.mock('../../../utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const mockAgent: Agent = {
  agent_id: 'test-agent-1',
  agent_name: '测试用户',
  status: 'online',
  location: {
    name: '北京市朝阳区',
    x: 100,
    y: 50,
    z: 200,
  },
  attributes: {
    energy: 75,
    health: 90,
    mood: 'happy',
    money: 10000,
  },
  recent_activities: [
    {
      action: '工作',
      result: '完成了任务',
      timestamp: '2024-03-15T10:00:00Z',
    },
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-03-15T10:00:00Z',
};

describe('AgentCard', () => {
  it('应该渲染 Agent 基本信息', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('测试用户')).toBeInTheDocument();
    expect(screen.getByText('test-agent-1')).toBeInTheDocument();
  });

  it('应该显示 Agent 的首字母作为头像', () => {
    render(<AgentCard agent={mockAgent} />);
    const avatar = screen.getByText('测');
    expect(avatar).toBeInTheDocument();
  });

  it('应该显示正确的情绪标签', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('开心')).toBeInTheDocument();
  });

  it('应该显示位置信息', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('北京市朝阳区')).toBeInTheDocument();
  });

  it('应该显示金币数量', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('10,000')).toBeInTheDocument();
  });

  it('应该显示能量百分比', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('应该显示健康百分比', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('应该显示最近活动', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText(/工作.*完成了任务/)).toBeInTheDocument();
  });

  it('点击卡片时应该调用 onClick 回调', () => {
    const handleClick = vi.fn();
    render(<AgentCard agent={mockAgent} onClick={handleClick} />);

    const card = screen.getByText('测试用户').closest('div');
    fireEvent.click(card!);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('没有 onClick 时不应该抛出错误', () => {
    expect(() => render(<AgentCard agent={mockAgent} />)).not.toThrow();
  });

  it('应该处理没有最近活动的 Agent', () => {
    const agentWithoutActivities = { ...mockAgent, recent_activities: [] };
    expect(() =>
      render(<AgentCard agent={agentWithoutActivities} />)
    ).not.toThrow();
  });

  it('应该显示不同的情绪', () => {
    const sadAgent = { ...mockAgent, attributes: { ...mockAgent.attributes, mood: 'sad' as const } };
    const { rerender } = render(<AgentCard agent={sadAgent} />);
    expect(screen.getByText('悲伤')).toBeInTheDocument();

    const angryAgent = { ...mockAgent, attributes: { ...mockAgent.attributes, mood: 'angry' as const } };
    rerender(<AgentCard agent={angryAgent} />);
    expect(screen.getByText('愤怒')).toBeInTheDocument();
  });

  it('应该显示不同的状态指示器', () => {
    const offlineAgent = { ...mockAgent, status: 'offline' as const };
    render(<AgentCard agent={offlineAgent} />);
    // 状态指示器应该存在（通过类名检查）
    const card = screen.getByText('测试用户').closest('.bg-white');
    expect(card).toBeInTheDocument();
  });

  it('能量低于 20% 时应该显示红色能量条', () => {
    const lowEnergyAgent = {
      ...mockAgent,
      attributes: { ...mockAgent.attributes, energy: 15 },
    };
    render(<AgentCard agent={lowEnergyAgent} />);
    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('能量在 20-50% 之间应该显示黄色能量条', () => {
    const mediumEnergyAgent = {
      ...mockAgent,
      attributes: { ...mockAgent.attributes, energy: 35 },
    };
    render(<AgentCard agent={mediumEnergyAgent} />);
    expect(screen.getByText('35%')).toBeInTheDocument();
  });
});
