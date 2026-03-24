import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAgents() {
  const agents = await prisma.agent.findMany({
    where: { status: 'online' },
    select: { agent_id: true, agent_name: true }
  });
  console.log('Online agents:', JSON.stringify(agents, null, 2));
}

listAgents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
