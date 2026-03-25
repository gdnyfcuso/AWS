import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAgents() {
  console.log('========================================');
  console.log('开始清理所有 Agent 数据');
  console.log('========================================\n');

  try {
    // 1. 清理车辆交互记录
    const vehicleInteractions = await prisma.vehicleInteraction.deleteMany({});
    console.log(`✓ 车辆交互记录: ${vehicleInteractions.count} 条`);

    // 2. 清理车辆状态
    const vehicleStates = await prisma.vehicleState.deleteMany({});
    console.log(`✓ 车辆状态: ${vehicleStates.count} 条`);

    // 3. 清理车辆 (没有 owner 的也会被清理)
    const vehicles = await prisma.vehicle.deleteMany({});
    console.log(`✓ 车辆: ${vehicles.count} 条`);

    // 4. 清理聊天消息
    const chatMessages = await prisma.chatMessage.deleteMany({});
    console.log(`✓ 聊天消息: ${chatMessages.count} 条`);

    // 5. 清理交易记录
    const transactions = await prisma.transaction.deleteMany({});
    console.log(`✓ 交易记录: ${transactions.count} 条`);

    // 6. 清理关系
    const relationships = await prisma.relationship.deleteMany({});
    console.log(`✓ 关系: ${relationships.count} 条`);

    // 7. 清理行动记录
    const actions = await prisma.action.deleteMany({});
    console.log(`✓ 行动记录: ${actions.count} 条`);

    // 8. 清理事件 (包括没有 agent 的事件)
    const events = await prisma.event.deleteMany({});
    console.log(`✓ 事件: ${events.count} 条`);

    // 9. 清理平台适配器
    const platformAdapters = await prisma.platformAdapter.deleteMany({});
    console.log(`✓ 平台适配器: ${platformAdapters.count} 条`);

    // 10. 清理技能
    const skills = await prisma.skills.deleteMany({});
    console.log(`✓ 技能: ${skills.count} 条`);

    // 11. 清理情感状态
    const emotionalStates = await prisma.emotionalState.deleteMany({});
    console.log(`✓ 情感状态: ${emotionalStates.count} 条`);

    // 12. 清理生理需求
    const physiologicalNeeds = await prisma.physiologicalNeeds.deleteMany({});
    console.log(`✓ 生理需求: ${physiologicalNeeds.count} 条`);

    // 13. 清理虚拟形象
    const avatars = await prisma.avatar.deleteMany({});
    console.log(`✓ 虚拟形象: ${avatars.count} 条`);

    // 14. 清理 Agent 状态
    const agentStates = await prisma.agentState.deleteMany({});
    console.log(`✓ Agent 状态: ${agentStates.count} 条`);

    // 15. 最后清理 Agent
    const agents = await prisma.agent.deleteMany({});
    console.log(`✓ Agent: ${agents.count} 条\n`);

    // 16. 可选：重置位置数据 (保留位置定义，只清空当前 agent 数量)
    const locations = await prisma.location.updateMany({
      data: { current_agents: 0 },
    });
    console.log(`✓ 重置位置状态: ${locations.count} 个位置\n`);

    // 17. 可选：重置世界状态
    await prisma.worldState.updateMany({
      data: {
        active_agents: 0,
        total_events_today: 0,
      },
    });
    console.log(`✓ 重置世界状态\n`);

    console.log('========================================');
    console.log('✅ 所有 Agent 数据清理完成!');
    console.log('========================================');

  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  }
}

clearAgents()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('错误:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
