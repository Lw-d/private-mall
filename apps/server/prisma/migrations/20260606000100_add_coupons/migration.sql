-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('FIXED_AMOUNT') NOT NULL DEFAULT 'FIXED_AMOUNT',
    `thresholdAmount` DECIMAL(10, 2) NOT NULL,
    `discountAmount` DECIMAL(10, 2) NOT NULL,
    `totalStock` INTEGER NOT NULL,
    `claimedCount` INTEGER NOT NULL DEFAULT 0,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `perUserLimit` INTEGER NOT NULL DEFAULT 1,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_code_key`(`code`),
    INDEX `coupons_status_idx`(`status`),
    INDEX `coupons_validFrom_idx`(`validFrom`),
    INDEX `coupons_validTo_idx`(`validTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_coupons` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'LOCKED', 'USED', 'EXPIRED', 'VOID') NOT NULL DEFAULT 'AVAILABLE',
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usedAt` DATETIME(3) NULL,
    `lockedAt` DATETIME(3) NULL,
    `orderId` VARCHAR(191) NULL,

    UNIQUE INDEX `user_coupons_orderId_key`(`orderId`),
    INDEX `user_coupons_userId_idx`(`userId`),
    INDEX `user_coupons_couponId_idx`(`couponId`),
    INDEX `user_coupons_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `orders`
    ADD COLUMN `discountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `userCouponId` VARCHAR(191) NULL,
    ADD COLUMN `couponId` VARCHAR(191) NULL,
    ADD COLUMN `couponCode` VARCHAR(191) NULL,
    ADD COLUMN `couponName` VARCHAR(191) NULL,
    ADD COLUMN `couponDiscountAmount` DECIMAL(10, 2) NULL,
    ADD INDEX `orders_userCouponId_idx`(`userCouponId`);

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
