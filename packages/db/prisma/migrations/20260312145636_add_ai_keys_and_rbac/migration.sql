/*
  Warnings:

  - You are about to alter the column `protocol` on the `ai_proxies` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(3))`.
  - Made the column `isHealthy` on table `ai_proxies` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `ai_models_type_isDefault_idx` ON `ai_models`;

-- DropIndex
DROP INDEX `ai_proxies_lastCheckAt_idx` ON `ai_proxies`;

-- AlterTable
ALTER TABLE `ai_models` ADD COLUMN `capabilities` JSON NOT NULL,
    ADD COLUMN `voiceCost` DOUBLE NULL;

-- AlterTable
ALTER TABLE `ai_proxies` ADD COLUMN `avgLatency` INTEGER NULL,
    ADD COLUMN `successRequests` INTEGER NOT NULL DEFAULT 0,
    MODIFY `protocol` ENUM('HTTP', 'HTTPS', 'SOCKS5') NOT NULL DEFAULT 'HTTP',
    MODIFY `isHealthy` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `ai_api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `apiKey` VARCHAR(191) NOT NULL,
    `apiSecret` VARCHAR(191) NULL,
    `capabilities` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `weight` INTEGER NOT NULL DEFAULT 1,
    `quotaDaily` INTEGER NULL,
    `quotaUsed` INTEGER NOT NULL DEFAULT 0,
    `quotaResetAt` DATETIME(3) NULL,
    `successCount` INTEGER NOT NULL DEFAULT 0,
    `failCount` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `lastErrorAt` DATETIME(3) NULL,
    `lastErrorMsg` VARCHAR(191) NULL,
    `proxyMode` ENUM('AUTO', 'SPECIFIC', 'NONE') NOT NULL DEFAULT 'AUTO',
    `proxyId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_api_keys_providerId_idx`(`providerId`),
    INDEX `ai_api_keys_modelId_idx`(`modelId`),
    INDEX `ai_api_keys_isActive_idx`(`isActive`),
    INDEX `ai_api_keys_providerId_isActive_idx`(`providerId`, `isActive`),
    INDEX `ai_api_keys_providerId_modelId_isActive_idx`(`providerId`, `modelId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proxy_usage_logs` (
    `id` VARCHAR(191) NOT NULL,
    `proxyId` VARCHAR(191) NOT NULL,
    `keyId` VARCHAR(191) NULL,
    `providerId` VARCHAR(191) NULL,
    `targetHost` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `latency` INTEGER NOT NULL,
    `errorMsg` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `proxy_usage_logs_proxyId_idx`(`proxyId`),
    INDEX `proxy_usage_logs_createdAt_idx`(`createdAt`),
    INDEX `proxy_usage_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('SYSTEM', 'PROJECT') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_name_key`(`name`),
    UNIQUE INDEX `permissions_resource_action_key`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_system_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `user_system_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_member_roles` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,

    INDEX `project_member_roles_projectId_idx`(`projectId`),
    INDEX `project_member_roles_userId_idx`(`userId`),
    UNIQUE INDEX `project_member_roles_projectId_userId_key`(`projectId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ai_proxies_protocol_idx` ON `ai_proxies`(`protocol`);

-- CreateIndex
CREATE INDEX `ai_proxies_location_idx` ON `ai_proxies`(`location`);

-- AddForeignKey
ALTER TABLE `ai_api_keys` ADD CONSTRAINT `ai_api_keys_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_api_keys` ADD CONSTRAINT `ai_api_keys_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `ai_models`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_api_keys` ADD CONSTRAINT `ai_api_keys_proxyId_fkey` FOREIGN KEY (`proxyId`) REFERENCES `ai_proxies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_system_roles` ADD CONSTRAINT `user_system_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_system_roles` ADD CONSTRAINT `user_system_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_member_roles` ADD CONSTRAINT `project_member_roles_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_member_roles` ADD CONSTRAINT `project_member_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_member_roles` ADD CONSTRAINT `project_member_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
