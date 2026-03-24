import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getApiKey() {
  const agent = await prisma.agent.findUnique({
    where: { agent_id: 'guchen_agent' },
    select: { agent_id: true, agent_name: true, api_key: true }
  });

  if (agent) {
    console.log(`Agent ID: ${agent.agent_id}`);
    console.log(`Agent Name: ${agent.agent_name}`);
    console.log(`API Key: ${agent.api_key}`);
  } else {
    console.log('Agent not found');
  }
}

getApiKey()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
