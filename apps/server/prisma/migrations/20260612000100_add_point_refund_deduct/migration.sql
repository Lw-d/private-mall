ALTER TABLE `point_ledgers`
  MODIFY `type` ENUM('ORDER_EARN', 'ORDER_REFUND_DEDUCT', 'ADJUSTMENT') NOT NULL;

ALTER TABLE `point_ledgers`
  DROP INDEX `point_ledgers_orderId_key`,
  ADD UNIQUE INDEX `point_ledgers_orderId_type_key`(`orderId`, `type`);
