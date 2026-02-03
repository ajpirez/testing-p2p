-- Fix orders created from BUY offers: maker should be buyer, taker should be seller.
-- Previously both were reversed. Swap buyerId and sellerId for those orders.
UPDATE "Order" o
SET "buyerId" = o."sellerId",
    "sellerId" = o."buyerId"
FROM "Offer" f
WHERE o."offerId" = f.id
  AND f.side = 'BUY';
