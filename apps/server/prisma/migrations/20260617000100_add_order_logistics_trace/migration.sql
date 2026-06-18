CREATE TABLE `order_logistics_traces` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `content` VARCHAR(191) NOT NULL,
  `logisticsCompany` VARCHAR(191) NULL,
  `trackingNo` VARCHAR(191) NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `order_logistics_traces_orderId_idx`(`orderId`),
  INDEX `order_logistics_traces_occurredAt_idx`(`occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `order_logistics_traces`
  ADD CONSTRAINT `order_logistics_traces_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
