-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `role` ENUM('USER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER',
    `passwordHash` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bio` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `preferences` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_userId_key`(`userId`),
    INDEX `profiles_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configs` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configs_key_key`(`key`),
    INDEX `configs_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_providers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `baseUrl` VARCHAR(191) NOT NULL,
    `apiKey` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `weight` INTEGER NOT NULL DEFAULT 1,
    `proxyMode` VARCHAR(191) NOT NULL DEFAULT 'auto',
    `proxyId` VARCHAR(191) NULL,
    `rateLimit` INTEGER NULL,
    `quotaDaily` INTEGER NULL,
    `metadata` JSON NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_providers_name_key`(`name`),
    INDEX `ai_providers_isActive_idx`(`isActive`),
    INDEX `ai_providers_priority_idx`(`priority`),
    INDEX `ai_providers_name_idx`(`name`),
    INDEX `ai_providers_proxyId_fkey`(`proxyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_models` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'EMBEDDING') NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `maxTokens` INTEGER NULL,
    `contextWindow` INTEGER NULL,
    `inputCost` DOUBLE NULL,
    `outputCost` DOUBLE NULL,
    `imageCost` DOUBLE NULL,
    `videoCost` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `rateLimit` INTEGER NULL,
    `rpm` INTEGER NULL,
    `tpm` INTEGER NULL,
    `metadata` JSON NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_models_type_idx`(`type`),
    INDEX `ai_models_isEnabled_idx`(`isEnabled`),
    INDEX `ai_models_type_isDefault_idx`(`type`, `isDefault`),
    UNIQUE INDEX `ai_models_providerId_modelId_key`(`providerId`, `modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_proxies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `protocol` VARCHAR(191) NOT NULL DEFAULT 'http',
    `username` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isHealthy` BOOLEAN NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `lastCheckAt` DATETIME(3) NULL,
    `checkLatency` INTEGER NULL,
    `checkError` VARCHAR(191) NULL,
    `consecutiveFailures` INTEGER NOT NULL DEFAULT 0,
    `totalRequests` INTEGER NOT NULL DEFAULT 0,
    `failedRequests` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `maxConcurrent` INTEGER NOT NULL DEFAULT 10,
    `currentConcurrent` INTEGER NOT NULL DEFAULT 0,
    `location` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_proxies_name_key`(`name`),
    INDEX `ai_proxies_isActive_idx`(`isActive`),
    INDEX `ai_proxies_isHealthy_idx`(`isHealthy`),
    INDEX `ai_proxies_lastCheckAt_idx`(`lastCheckAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NULL,
    `inputTokens` INTEGER NULL,
    `outputTokens` INTEGER NULL,
    `imageCount` INTEGER NULL,
    `videoCount` INTEGER NULL,
    `duration` DOUBLE NULL,
    `cost` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('SUCCESS', 'FAILED', 'RATE_LIMITED', 'TIMEOUT', 'CANCELLED') NOT NULL DEFAULT 'SUCCESS',
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `episodeId` VARCHAR(191) NULL,
    `taskId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `latency` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_logs_providerId_idx`(`providerId`),
    INDEX `ai_usage_logs_status_idx`(`status`),
    INDEX `ai_usage_logs_projectId_idx`(`projectId`),
    INDEX `ai_usage_logs_createdAt_idx`(`createdAt`),
    INDEX `ai_usage_logs_taskId_idx`(`taskId`),
    INDEX `ai_usage_logs_providerId_createdAt_idx`(`providerId`, `createdAt`),
    INDEX `ai_usage_logs_projectId_createdAt_idx`(`projectId`, `createdAt`),
    INDEX `ai_usage_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ai_usage_logs_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `ai_usage_logs_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `type` ENUM('IMAGE', 'VIDEO', 'AUDIO', 'CHARACTER_SHEET', 'LOCATION_SHEET') NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `size` INTEGER NULL,
    `duration` DOUBLE NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'COMPLETED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `assets_projectId_idx`(`projectId`),
    INDEX `assets_type_idx`(`type`),
    INDEX `assets_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED', 'PAUSED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    INDEX `projects_userId_status_idx`(`userId`, `status`),
    INDEX `projects_userId_deletedAt_idx`(`userId`, `deletedAt`),
    INDEX `projects_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `episodes` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `novelText` VARCHAR(191) NULL,
    `characterAppearanceMap` JSON NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    INDEX `episodes_projectId_idx`(`projectId`),
    INDEX `episodes_projectId_deletedAt_idx`(`projectId`, `deletedAt`),
    UNIQUE INDEX `episodes_projectId_number_key`(`projectId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scripts` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `characters` JSON NULL,
    `scenes` JSON NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `scripts_episodeId_key`(`episodeId`),
    INDEX `scripts_episodeId_idx`(`episodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storyboards` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `clipId` VARCHAR(191) NULL,
    `sequence` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `imagePrompt` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `videoPrompt` VARCHAR(191) NULL,
    `videoUrl` VARCHAR(191) NULL,
    `duration` DOUBLE NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `storyboards_episodeId_sequence_idx`(`episodeId`, `sequence`),
    INDEX `storyboards_clipId_fkey`(`clipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clips` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `duration` DOUBLE NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',

    INDEX `clips_episodeId_sequence_idx`(`episodeId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `aliases` VARCHAR(191) NULL,
    `introduction` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `ageRange` VARCHAR(191) NULL,
    `roleLevel` ENUM('S', 'A', 'B', 'C', 'D') NULL,
    `archetype` VARCHAR(191) NULL,
    `personalityTags` VARCHAR(191) NULL,
    `eraPeriod` VARCHAR(191) NULL,
    `socialClass` VARCHAR(191) NULL,
    `occupation` VARCHAR(191) NULL,
    `costumeTier` INTEGER NULL,
    `suggestedColors` VARCHAR(191) NULL,
    `primaryIdentifier` VARCHAR(191) NULL,
    `visualKeywords` VARCHAR(191) NULL,
    `expectedAppearances` JSON NULL,
    `profileConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `character_profiles_projectId_idx`(`projectId`),
    INDEX `character_profiles_projectId_deletedAt_idx`(`projectId`, `deletedAt`),
    UNIQUE INDEX `character_profiles_projectId_name_key`(`projectId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_appearances` (
    `id` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `appearanceIndex` INTEGER NOT NULL DEFAULT 1,
    `changeReason` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `descriptions` VARCHAR(191) NULL,
    `imageUrls` VARCHAR(191) NULL,
    `previousImageUrls` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `character_appearances_characterId_idx`(`characterId`),
    UNIQUE INDEX `character_appearances_characterId_appearanceIndex_key`(`characterId`, `appearanceIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `eraPeriod` VARCHAR(191) NULL,
    `locationType` ENUM('INDOOR', 'OUTDOOR', 'NATURE', 'BUILDING', 'FANTASY') NULL,
    `moodColor` VARCHAR(191) NULL,
    `keyElements` VARCHAR(191) NULL,
    `locationConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `location_profiles_projectId_idx`(`projectId`),
    INDEX `location_profiles_projectId_deletedAt_idx`(`projectId`, `deletedAt`),
    UNIQUE INDEX `location_profiles_projectId_name_key`(`projectId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('SCRIPT_GENERATE', 'SCRIPT_EDIT', 'SCRIPT_REGENERATE', 'STORYBOARD_GENERATE', 'STORYBOARD_EDIT', 'STORYBOARD_REGENERATE', 'IMAGE_GENERATE', 'IMAGE_REGENERATE', 'VIDEO_GENERATE', 'VIDEO_REGENERATE', 'VOICE_GENERATE', 'VOICE_REGENERATE', 'CHARACTER_PROFILE_ANALYZE', 'CHARACTER_VISUAL_GENERATE', 'CHARACTER_VISUAL_REGENERATE', 'LOCATION_ANALYZE', 'LOCATION_VISUAL_GENERATE', 'LOCATION_VISUAL_REGENERATE', 'EPISODE_EXPORT', 'PROJECT_ARCHIVE') NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING') NOT NULL DEFAULT 'QUEUED',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `attempt` INTEGER NOT NULL DEFAULT 0,
    `payload` JSON NULL,
    `result` JSON NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `queuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NULL,

    INDEX `tasks_status_type_idx`(`status`, `type`),
    INDEX `tasks_projectId_idx`(`projectId`),
    INDEX `tasks_episodeId_idx`(`episodeId`),
    INDEX `tasks_userId_idx`(`userId`),
    INDEX `tasks_projectId_status_idx`(`projectId`, `status`),
    INDEX `tasks_userId_status_idx`(`userId`, `status`),
    INDEX `tasks_targetId_targetType_idx`(`targetId`, `targetType`),
    INDEX `tasks_status_queuedAt_idx`(`status`, `queuedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_events_taskId_idx`(`taskId`),
    INDEX `task_events_projectId_createdAt_idx`(`projectId`, `createdAt`),
    INDEX `task_events_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_costs` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `cost` DOUBLE NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `usage_costs_projectId_userId_idx`(`projectId`, `userId`),
    INDEX `usage_costs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_members` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `invitedBy` VARCHAR(191) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `project_members_userId_idx`(`userId`),
    UNIQUE INDEX `project_members_projectId_userId_key`(`projectId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_comments` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `project_comments_projectId_createdAt_idx`(`projectId`, `createdAt`),
    INDEX `project_comments_episodeId_idx`(`episodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_invites` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `token` VARCHAR(191) NOT NULL,
    `invitedBy` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `project_invites_token_key`(`token`),
    INDEX `project_invites_token_idx`(`token`),
    INDEX `project_invites_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_activities` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NULL,
    `targetId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_activities_projectId_createdAt_idx`(`projectId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credits` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `totalEarned` DOUBLE NOT NULL DEFAULT 0,
    `totalUsed` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `credits_userId_key`(`userId`),
    INDEX `credits_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `creditId` VARCHAR(191) NOT NULL,
    `type` ENUM('EARN', 'USE', 'REFUND', 'BONUS', 'PENALTY') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `balance` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_transactions_creditId_idx`(`creditId`),
    INDEX `credit_transactions_type_idx`(`type`),
    INDEX `credit_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_providers` ADD CONSTRAINT `ai_providers_proxyId_fkey` FOREIGN KEY (`proxyId`) REFERENCES `ai_proxies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_models` ADD CONSTRAINT `ai_models_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `episodes` ADD CONSTRAINT `episodes_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scripts` ADD CONSTRAINT `scripts_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storyboards` ADD CONSTRAINT `storyboards_clipId_fkey` FOREIGN KEY (`clipId`) REFERENCES `clips`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storyboards` ADD CONSTRAINT `storyboards_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clips` ADD CONSTRAINT `clips_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_profiles` ADD CONSTRAINT `character_profiles_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_appearances` ADD CONSTRAINT `character_appearances_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `character_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_profiles` ADD CONSTRAINT `location_profiles_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_events` ADD CONSTRAINT `task_events_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_costs` ADD CONSTRAINT `usage_costs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_costs` ADD CONSTRAINT `usage_costs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_comments` ADD CONSTRAINT `project_comments_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_comments` ADD CONSTRAINT `project_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_comments` ADD CONSTRAINT `project_comments_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `project_comments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_invites` ADD CONSTRAINT `project_invites_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_activities` ADD CONSTRAINT `project_activities_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credits` ADD CONSTRAINT `credits_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_creditId_fkey` FOREIGN KEY (`creditId`) REFERENCES `credits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
