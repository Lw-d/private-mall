ALTER TABLE "after_sales"
ADD COLUMN "returnLogisticsCompany" TEXT,
ADD COLUMN "returnTrackingNo" TEXT,
ADD COLUMN "returnRemark" TEXT,
ADD COLUMN "buyerReturnedAt" TIMESTAMP(3),
ADD COLUMN "merchantReceivedAt" TIMESTAMP(3);
