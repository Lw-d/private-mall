CREATE TABLE `user_addresses` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `receiverName` VARCHAR(191) NOT NULL,
  `receiverPhone` VARCHAR(191) NOT NULL,
  `province` VARCHAR(191) NOT NULL,
  `city` VARCHAR(191) NOT NULL,
  `district` VARCHAR(191) NOT NULL,
  `detailAddress` VARCHAR(191) NOT NULL,
  `postalCode` VARCHAR(191) NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `user_addresses_userId_idx`(`userId`),
  INDEX `user_addresses_userId_isDefault_idx`(`userId`, `isDefault`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `orders`
  ADD COLUMN `shippingAddressId` VARCHAR(191) NULL,
  ADD COLUMN `receiverName` VARCHAR(191) NULL,
  ADD COLUMN `receiverPhone` VARCHAR(191) NULL,
  ADD COLUMN `receiverProvince` VARCHAR(191) NULL,
  ADD COLUMN `receiverCity` VARCHAR(191) NULL,
  ADD COLUMN `receiverDistrict` VARCHAR(191) NULL,
  ADD COLUMN `receiverDetailAddress` VARCHAR(191) NULL,
  ADD COLUMN `receiverPostalCode` VARCHAR(191) NULL;

CREATE INDEX `orders_shippingAddressId_idx` ON `orders`(`shippingAddressId`);

ALTER TABLE `user_addresses`
  ADD CONSTRAINT `user_addresses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `orders`
  ADD CONSTRAINT `orders_shippingAddressId_fkey` FOREIGN KEY (`shippingAddressId`) REFERENCES `user_addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
