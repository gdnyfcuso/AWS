import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getApiKey(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { agent_id: agentId },
    select: { agent_id: true, agent_name: true, api_key: true }
  });

  if (agent) {
    console.log(`${agent.agent_id}: ${agent.api_key}`);
  }
}

getApiKey(process.argv[2])
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
