-- Link POS orders to their generated invoice so a bill can only be created once
-- and so the table can be released only after the invoice is actually paid.
ALTER TABLE "public"."Order" ADD COLUMN "invoiceId" INTEGER;

CREATE UNIQUE INDEX "Order_invoiceId_key" ON "public"."Order"("invoiceId");

ALTER TABLE "public"."Order"
  ADD CONSTRAINT "Order_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;