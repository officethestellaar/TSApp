ALTER TABLE "public"."OrderItem" 
  ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customName" TEXT,
  ADD COLUMN "customPrice" DOUBLE PRECISION;

ALTER TABLE "public"."OrderItem" 
  ALTER COLUMN "menuItemId" DROP NOT NULL;
