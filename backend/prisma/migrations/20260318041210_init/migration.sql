-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "webhook_url" TEXT,
    "api_key" TEXT NOT NULL,
    "capabilities" JSONB,
    "preferences" JSONB,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "last_ping" TIMESTAMP(3),
    "home_location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "disconnected_at" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentState" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "money" DECIMAL(65,30) NOT NULL DEFAULT 1000,
    "energy" INTEGER NOT NULL DEFAULT 100,
    "mood" TEXT NOT NULL DEFAULT 'neutral',
    "health" INTEGER NOT NULL DEFAULT 100,
    "total_earned" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "interactions_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "coordinates" JSONB NOT NULL,
    "max_capacity" INTEGER,
    "current_agents" INTEGER NOT NULL DEFAULT 0,
    "parent_location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "parameters" JSONB,
    "reasoning" TEXT,
    "success" BOOLEAN NOT NULL,
    "result" JSONB,
    "error_message" TEXT,
    "state_changes" JSONB,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "agent_id" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "target_agent_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL DEFAULT 'stranger',
    "relationship_level" INTEGER NOT NULL DEFAULT 0,
    "interactions_count" INTEGER NOT NULL DEFAULT 0,
    "last_interaction" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "location_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldState" (
    "id" TEXT NOT NULL,
    "world_time" TEXT NOT NULL,
    "world_date" TEXT NOT NULL,
    "day_phase" TEXT NOT NULL,
    "weather" TEXT NOT NULL DEFAULT 'sunny',
    "season" TEXT NOT NULL DEFAULT 'spring',
    "active_agents" INTEGER NOT NULL DEFAULT 0,
    "total_events_today" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_agent_id_key" ON "Agent"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_api_key_key" ON "Agent"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "AgentState_agent_id_key" ON "AgentState"("agent_id");

-- CreateIndex
CREATE INDEX "AgentState_location_id_idx" ON "AgentState"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "Location_location_id_key" ON "Location"("location_id");

-- CreateIndex
CREATE INDEX "Location_type_idx" ON "Location"("type");

-- CreateIndex
CREATE INDEX "Action_agent_id_idx" ON "Action"("agent_id");

-- CreateIndex
CREATE INDEX "Action_performed_at_idx" ON "Action"("performed_at");

-- CreateIndex
CREATE INDEX "Event_event_type_idx" ON "Event"("event_type");

-- CreateIndex
CREATE INDEX "Event_timestamp_idx" ON "Event"("timestamp");

-- CreateIndex
CREATE INDEX "Event_agent_id_idx" ON "Event"("agent_id");

-- CreateIndex
CREATE INDEX "Relationship_agent_id_idx" ON "Relationship"("agent_id");

-- CreateIndex
CREATE INDEX "Relationship_target_agent_id_idx" ON "Relationship"("target_agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_agent_id_target_agent_id_key" ON "Relationship"("agent_id", "target_agent_id");

-- CreateIndex
CREATE INDEX "ChatMessage_sender_id_idx" ON "ChatMessage"("sender_id");

-- CreateIndex
CREATE INDEX "ChatMessage_receiver_id_idx" ON "ChatMessage"("receiver_id");

-- CreateIndex
CREATE INDEX "ChatMessage_sent_at_idx" ON "ChatMessage"("sent_at");

-- CreateIndex
CREATE INDEX "Transaction_sender_id_idx" ON "Transaction"("sender_id");

-- CreateIndex
CREATE INDEX "Transaction_receiver_id_idx" ON "Transaction"("receiver_id");

-- CreateIndex
CREATE INDEX "Transaction_created_at_idx" ON "Transaction"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_home_location_id_fkey" FOREIGN KEY ("home_location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentState" ADD CONSTRAINT "AgentState_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentState" ADD CONSTRAINT "AgentState_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parent_location_id_fkey" FOREIGN KEY ("parent_location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_target_agent_id_fkey" FOREIGN KEY ("target_agent_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
