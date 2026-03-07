-- CreateTable
CREATE TABLE "KnownServer" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 8006,
    "tlsMode" TEXT NOT NULL DEFAULT 'system',
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnownServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryResult" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL,
    "tlsDetected" BOOLEAN NOT NULL DEFAULT false,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionAudit" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "username" TEXT,
    "realm" TEXT,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppPreference" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppPreference_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ServerPreference" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSnapshot" (
    "upid" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "guestId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "exitStatus" TEXT,
    "user" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSnapshot_pkey" PRIMARY KEY ("upid")
);

-- CreateIndex
CREATE INDEX "KnownServer_host_idx" ON "KnownServer"("host");

-- CreateIndex
CREATE UNIQUE INDEX "KnownServer_host_port_key" ON "KnownServer"("host", "port");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryResult_host_port_key" ON "DiscoveryResult"("host", "port");

-- CreateIndex
CREATE INDEX "ConnectionAudit_serverId_idx" ON "ConnectionAudit"("serverId");

-- CreateIndex
CREATE INDEX "ConnectionAudit_occurredAt_idx" ON "ConnectionAudit"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServerPreference_serverId_key_key" ON "ServerPreference"("serverId", "key");

-- CreateIndex
CREATE INDEX "TaskSnapshot_serverId_idx" ON "TaskSnapshot"("serverId");

-- CreateIndex
CREATE INDEX "TaskSnapshot_startedAt_idx" ON "TaskSnapshot"("startedAt");

-- AddForeignKey
ALTER TABLE "ConnectionAudit" ADD CONSTRAINT "ConnectionAudit_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "KnownServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerPreference" ADD CONSTRAINT "ServerPreference_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "KnownServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
