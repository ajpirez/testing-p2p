export type CurrencyCode = "USDT" | "USDC";

export type FiatCode = "EUR" | "USD";

/** 5777=Ganache, 97=BSC Testnet, 56=BSC, 80002=Polygon Amoy, 137=Polygon */
export type ChainId = number;

export type PaymentMethodType = "BANK_TRANSFER" | "BIZUM" | "PAYPAL" | "CASH";

export type OfferSide = "BUY" | "SELL";

export type OrderStatus =
  | "CREATED"
  | "FUNDS_LOCKED"
  | "PAYMENT_MARKED"
  | "RELEASED"
  | "CANCELLED"
  | "EXPIRED"
  | "DISPUTED";

