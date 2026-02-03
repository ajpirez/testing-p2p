import { z } from "zod";

export const OfferSideSchema = z.enum(["BUY", "SELL"]);
export const CurrencyCodeSchema = z.enum(["USDT", "USDC"]);
export const FiatCodeSchema = z.enum(["EUR", "USD", "CUP"]);
export const PaymentMethodTypeSchema = z.enum([
  "BANK_TRANSFER",
  "BIZUM",
  "PAYPAL",
  "CASH",
]);

/** chainId: 1337=Ganache, 97=BSC Testnet, 56=BSC, 80002=Polygon Amoy, 137=Polygon */
export const CreateOfferSchema = z.object({
  chainId: z.number().int().positive(),
  side: OfferSideSchema,
  asset: CurrencyCodeSchema,
  fiat: FiatCodeSchema,
  price: z.number().positive(),
  minAmount: z.number().positive(),
  maxAmount: z.number().positive(),
  paymentMethods: z.array(PaymentMethodTypeSchema).min(1),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;

export const TakeOfferSchema = z.object({
  offerId: z.string().uuid(),
  amount: z.number().positive(),
});

export type TakeOfferInput = z.infer<typeof TakeOfferSchema>;

export const MarkPaidSchema = z.object({
  orderId: z.string().uuid(),
});

export const ReleaseSchema = z.object({
  orderId: z.string().uuid(),
});

