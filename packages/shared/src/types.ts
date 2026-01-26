export type CurrencyCode = "USDT" | "USDC";

export type FiatCode = "EUR" | "USD";

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

