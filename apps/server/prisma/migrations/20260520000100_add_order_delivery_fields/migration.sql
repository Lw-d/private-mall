-- AlterTable
ALTER TABLE `orders`
    ADD COLUMN `shippedAt` DATETIME(3) NULL,
    ADD COLUMN `logisticsCompany` VARCHAR(191) NULL,
    ADD COLUMN `trackingNo` VARCHAR(191) NULL,
    ADD COLUMN `deliveryRemark` VARCHAR(191) NULL;
