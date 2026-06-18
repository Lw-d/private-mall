CREATE TABLE `after_sales` (
    `id` VARCHAR(191) NOT NULL,
    `afterSaleNo` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('REFUND_ONLY', 'RETURN_REFUND') NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'WAIT_BUYER_RETURN', 'BUYER_RETURNED', 'MERCHANT_RECEIVED', 'REFUNDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `evidenceImageUrls` JSON NULL,
    `requestedAmount` DECIMAL(10, 2) NOT NULL,
    `approvedAmount` DECIMAL(10, 2) NULL,
    `rejectReason` VARCHAR(191) NULL,
    `merchantRemark` VARCHAR(191) NULL,
    `refundId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `after_sales_afterSaleNo_key`(`afterSaleNo`),
    UNIQUE INDEX `after_sales_refundId_key`(`refundId`),
    INDEX `after_sales_orderId_idx`(`orderId`),
    INDEX `after_sales_userId_idx`(`userId`),
    INDEX `after_sales_status_idx`(`status`),
    INDEX `after_sales_type_idx`(`type`),
    INDEX `after_sales_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `after_sale_logs` (
    `id` VARCHAR(191) NOT NULL,
    `afterSaleId` VARCHAR(191) NOT NULL,
    `actorType` ENUM('USER', 'ADMIN', 'SYSTEM') NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `after_sale_logs_afterSaleId_idx`(`afterSaleId`),
    INDEX `after_sale_logs_actorType_idx`(`actorType`),
    INDEX `after_sale_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `after_sales` ADD CONSTRAINT `after_sales_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `after_sales` ADD CONSTRAINT `after_sales_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `after_sales` ADD CONSTRAINT `after_sales_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `after_sale_logs` ADD CONSTRAINT `after_sale_logs_afterSaleId_fkey` FOREIGN KEY (`afterSaleId`) REFERENCES `after_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
