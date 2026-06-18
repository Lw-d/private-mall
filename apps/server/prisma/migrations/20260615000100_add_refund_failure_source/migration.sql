ALTER TABLE `refunds`
  ADD COLUMN `failureSource` ENUM('ADMIN_REJECT', 'WECHAT_REQUEST', 'WECHAT_NOTIFY') NULL,
  ADD COLUMN `failureReason` VARCHAR(191) NULL;

CREATE INDEX `refunds_failureSource_idx` ON `refunds`(`failureSource`);
