import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAgents() {
  console.log('开始清理 Agent 数据...');

  // 删除 Agent 状态
  const deletedStates = await prisma.agentState.deleteMany({});
  console.log(`删除了 ${deletedStates.count} 条 AgentState 记录`);

  // 删除 Agent
  const deletedAgents = await prisma.agent.deleteMany({});
  console.log(`删除了 ${deletedAgents.count} 条 Agent 记录`);

  console.log('Agent 数据清理完成!');
}

clearAgents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('清理失败:', error);
    process.exit(1);
  });
