ALTER TABLE `users`
  ADD COLUMN `pointsBalance` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `point_ledgers` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `type` ENUM('ORDER_EARN', 'ADJUSTMENT') NOT NULL,
  `points` INTEGER NOT NULL,
  `balanceAfter` INTEGER NOT NULL,
  `description` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `point_ledgers_orderId_key`(`orderId`),
  INDEX `point_ledgers_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `point_ledgers_type_idx`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `point_ledgers`
  ADD CONSTRAINT `point_ledgers_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `point_ledgers`
  ADD CONSTRAINT `point_ledgers_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
