ALTER TABLE `after_sales`
ADD COLUMN `returnLogisticsCompany` TEXT NULL,
ADD COLUMN `returnTrackingNo` TEXT NULL,
ADD COLUMN `returnRemark` TEXT NULL,
ADD COLUMN `buyerReturnedAt` DATETIME(3) NULL,
ADD COLUMN `merchantReceivedAt` DATETIME(3) NULL;
