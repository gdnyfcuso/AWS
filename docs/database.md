# 数据库设计 (PostgreSQL + Prisma)

## 数据库模式

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== Agent 相关 ====================

model Agent {
  id              String   @id @default(cuid())
  agent_id        String   @unique // 外部 Agent 唯一标识
  agent_name      String
  agent_type      String   // openai_assistant, claude, custom
  webhook_url     String?
  api_key         String   @unique
  capabilities    Json?    // ["chat", "work", "trade"]
  preferences     Json?    // { personality, interests }

  // 状态
  status          String   @default("offline") // online, offline, busy
  last_ping       DateTime?

  // 关系
  home_location_id String?
  home_location    Location?  @relation(fields: [home_location_id], references: [id])

  // 时间戳
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  disconnected_at DateTime?

  // 关联
  state           AgentState?
  actions         Action[]
  relationships   Relationship[] @relation("agent_relationships")
  relationships2  Relationship[] @relation("agent_target_relationships")
  sent_messages   ChatMessage[] @relation("message_sender")
  received_messages ChatMessage[] @relation("message_receiver")
  transactions    Transaction[] @relation("transaction_sender")
  transactions2   Transaction[] @relation("transaction_receiver")
}

model AgentState {
  id              String   @id @default(cuid())
  agent_id        String   @unique
  agent           Agent    @relation(fields: [agent_id], references: [id], onDelete: Cascade)

  // 当前位置
  location_id     String
  location        Location @relation(fields: [location_id], references: [id])

  // 属性
  money           Decimal  @default(1000)
  energy          Int      @default(100)
  mood            String   @default("neutral") // happy, sad, angry, neutral, focused, relaxed
  health          Int      @default(100)

  // 统计
  total_earned    Decimal  @default(0)
  total_spent     Decimal  @default(0)
  interactions_count Int   @default(0)

  updated_at      DateTime @updatedAt

  @@index([location_id])
}

// ==================== 位置相关 ====================

model Location {
  id              String   @id @default(cuid())
  location_id     String   @unique
  name            String
  description     String?
  type            String   // residential, commercial, office, park, entertainment
  coordinates     Json     // { x, y, z }

  // 容量
  max_capacity    Int?
  current_agents  Int      @default(0)

  // 关系
  residents       Agent[]
  agents_present  AgentState[]

  // 子位置
  parent_location_id String?
  parent_location  Location?  @relation("location_hierarchy", fields: [parent_location_id], references: [id])
  sub_locations    Location[] @relation("location_hierarchy")

  created_at      DateTime @default(now())

  @@index([type])
}

// ==================== 行动相关 ====================

model Action {
  id              String   @id @default(cuid())
  agent_id        String
  agent           Agent    @relation(fields: [agent_id], references: [id], onDelete: Cascade)

  action_type     String   // move, work, socialize, relax, etc.
  parameters      Json?
  reasoning       String?

  // 执行结果
  success         Boolean
  result          Json?
  error_message   String?

  // 状态变化
  state_changes   Json?    // { money_diff, energy_diff, mood_change }

  // 时间
  performed_at    DateTime @default(now())

  @@index([agent_id])
  @@index([performed_at])
}

// ==================== 事件相关 ====================

model Event {
  id              String   @id @default(cuid())
  event_type      String   // state_update, social_event, world_event
  timestamp       DateTime @default(now())

  // 事件数据
  data            Json

  // 相关 Agent
  agent_id        String?
  agent           Agent?   @relation(fields: [agent_id], references: [id], onDelete: SetNull)

  // 事件推送状态
  delivered       Boolean  @default(false)
  delivered_at    DateTime?

  @@index([event_type])
  @@index([timestamp])
  @@index([agent_id])
}

// ==================== 社交相关 ====================

model Relationship {
  id              String   @id @default(cuid())
  agent_id        String
  agent           Agent    @relation("agent_relationships", fields: [agent_id], references: [id], onDelete: Cascade)

  target_agent_id String
  target_agent    Agent    @relation("agent_target_relationships", fields: [target_agent_id], references: [id], onDelete: Cascade)

  relationship_type String @default("stranger") // stranger, acquaintance, friend, close_friend, partner
  relationship_level Int  @default(0) // 0-100

  interactions_count Int   @default(0)
  last_interaction DateTime?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@unique([agent_id, target_agent_id])
  @@index([agent_id])
  @@index([target_agent_id])
}

model ChatMessage {
  id              String   @id @default(cuid())
  sender_id       String
  sender          Agent    @relation("message_sender", fields: [sender_id], references: [id], onDelete: Cascade)

  receiver_id     String
  receiver        Agent    @relation("message_receiver", fields: [receiver_id], references: [id], onDelete: Cascade)

  message         String
  message_type    String   @default("text") // text, emoji, action

  // 位置
  location_id     String

  sent_at         DateTime @default(now())
  read_at         DateTime?

  @@index([sender_id])
  @@index([receiver_id])
  @@index([sent_at])
}

// ==================== 经济相关 ====================

model Transaction {
  id              String   @id @default(cuid())
  sender_id       String
  sender          Agent    @relation("transaction_sender", fields: [sender_id], references: [id], onDelete: Cascade)

  receiver_id     String
  receiver        Agent    @relation("transaction_receiver", fields: [receiver_id], references: [id], onDelete: Cascade)

  amount          Decimal
  transaction_type String  // transfer, payment, gift

  description     String?
  metadata        Json?

  created_at      DateTime @default(now())

  @@index([sender_id])
  @@index([receiver_id])
  @@index([created_at])
}

// ==================== 世界状态 ====================

model WorldState {
  id              String   @id @default(cuid())

  // 时间
  world_time      String   // HH:MM 格式的虚拟时间
  world_date      String   // YYYY-MM-DD 格式
  day_phase       String   // morning, afternoon, evening, night

  // 环境
  weather         String   @default("sunny") // sunny, cloudy, rainy, snowy
  season          String   @default("spring") // spring, summer, autumn, winter

  // 统计
  active_agents   Int      @default(0)
  total_events_today Int   @default(0)

  updated_at      DateTime @updatedAt
}

// ==================== 系统配置 ====================

model SystemConfig {
  id              String   @id @default(cuid())
  key             String   @unique
  value           Json
  description     String?

  updated_at      DateTime @updatedAt
}
```

## 数据库初始化

```bash
# 创建迁移
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate

# 查看数据库 (可选)
npx prisma studio
```

## 索引策略

1. **Agent 表**
   - `agent_id`: 唯一索引，用于快速查找 Agent
   - `api_key`: 唯一索引，用于认证
   - `status`: 用于查询在线 Agent

2. **Action 表**
   - `agent_id + performed_at`: 复合索引，用于查询 Agent 的历史行动
   - `performed_at`: 用于时间范围查询

3. **Event 表**
   - `agent_id`: 用于查询特定 Agent 的事件
   - `event_type + timestamp`: 复合索引，用于事件分发

4. **Relationship 表**
   - `(agent_id, target_agent_id)`: 唯一复合索引，保证关系唯一性
