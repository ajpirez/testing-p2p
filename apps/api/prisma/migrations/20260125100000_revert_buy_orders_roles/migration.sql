-- Revert: restore previous buyer/seller for BUY orders so existing RELEASED orders
-- show the correct role again. Role for display/permissions is computed from offer.side + makerId.
UPDATE "Order" o
SET "buyerId" = o."sellerId",
    "sellerId" = o."buyerId"
FROM "Offer" f
WHERE o."offerId" = f.id
  AND f.side = 'BUY';
