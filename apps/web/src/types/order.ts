/**
 * Tipos y constantes para el flujo P2P
 */

export type AllowanceCheck =
  | { notApplicable: true }
  | {
      notApplicable?: false;
      sufficient: boolean;
      allowance: string;
      amountRequired: string;
      asset: string;
    };

export type OrderStatus =
  | "CREATED"
  | "FUNDS_LOCKED"
  | "PAYMENT_MARKED"
  | "RELEASED"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED"
  | "REFUNDED";

export type UserRole = "seller" | "buyer" | "spectator";

export interface Order {
  id: string;
  status: OrderStatus;
  amount: number;
  chainId?: number;
  buyerId: string;
  sellerId: string;
  escrowOrderId?: string | null;
  fundTxHash?: string | null;
  releaseTxHash?: string | null;
  buyer?: {
    id: string;
    email?: string | null;
    walletAddress?: string | null;
  };
  seller?: {
    id: string;
    email?: string | null;
    walletAddress?: string | null;
  };
  offer?: {
    id: string;
    makerId?: string;
    side: string;
    asset: string;
    fiat: string;
    price: number;
    chainId?: number;
    paymentMethods: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface StepConfig {
  step: number;
  label: string;
  description: string;
}

export interface RoleAction {
  action: "lock-funds" | "mark-paid" | "release" | "dispute" | null;
  label?: string;
  message: string;
  variant?: "primary" | "success" | "warning" | "danger";
  showPaymentInfo?: boolean;
}

export interface StatusConfig {
  step: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  seller: RoleAction;
  buyer: RoleAction;
}

/**
 * Configuración de pasos del timeline
 */
export const STEPS: StepConfig[] = [
  { step: 1, label: "Orden Creada", description: "Orden iniciada" },
  { step: 2, label: "Fondos Bloqueados", description: "En escrow" },
  { step: 3, label: "Pago Confirmado", description: "Buyer pagó" },
  { step: 4, label: "Fondos Liberados", description: "Release on-chain" },
];

/**
 * Configuración de estados con acciones por rol
 */
export const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  CREATED: {
    step: 1,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    icon: "⏳",
    seller: {
      action: "lock-funds",
      label: "Bloquear Fondos",
      message: "Bloquea tus fondos en el escrow para que el buyer pueda realizar el pago fiat.",
      variant: "primary",
    },
    buyer: {
      action: null,
      message: "Esperando que el seller bloquee los fondos en el escrow. Una vez bloqueados, podrás realizar el pago.",
    },
  },
  FUNDS_LOCKED: {
    step: 2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    icon: "🔒",
    seller: {
      action: null,
      message: "Fondos bloqueados en escrow. Esperando que el buyer realice el pago fiat y lo confirme.",
    },
    buyer: {
      action: "mark-paid",
      label: "Confirmar Pago",
      message: "Los fondos están bloqueados. Realiza el pago al seller usando los datos indicados y confirma.",
      variant: "primary",
      showPaymentInfo: true,
    },
  },
  PAYMENT_MARKED: {
    step: 3,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    icon: "💸",
    seller: {
      action: "release",
      label: "Liberar Fondos",
      message: "El buyer ha confirmado el pago. Verifica que recibiste el dinero y libera los fondos.",
      variant: "success",
    },
    buyer: {
      action: null,
      message: "Has confirmado el pago. Esperando que el seller verifique y libere los fondos del escrow.",
    },
  },
  RELEASED: {
    step: 4,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    icon: "✅",
    seller: {
      action: null,
      message: "¡Transacción completada exitosamente! Los fondos han sido liberados al buyer.",
    },
    buyer: {
      action: null,
      message: "¡Transacción completada exitosamente! Has recibido los fondos en tu wallet.",
    },
  },
  COMPLETED: {
    step: 4,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    icon: "✅",
    seller: {
      action: null,
      message: "¡Transacción completada exitosamente!",
    },
    buyer: {
      action: null,
      message: "¡Transacción completada exitosamente!",
    },
  },
  DISPUTED: {
    step: 3,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    icon: "⚠️",
    seller: {
      action: null,
      message: "Esta orden está en disputa. Un moderador revisará el caso.",
    },
    buyer: {
      action: null,
      message: "Esta orden está en disputa. Un moderador revisará el caso.",
    },
  },
  CANCELLED: {
    step: 1,
    color: "text-zinc-600",
    bgColor: "bg-zinc-50",
    borderColor: "border-zinc-300",
    icon: "❌",
    seller: {
      action: null,
      message: "Esta orden ha sido cancelada.",
    },
    buyer: {
      action: null,
      message: "Esta orden ha sido cancelada.",
    },
  },
  REFUNDED: {
    step: 2,
    color: "text-zinc-600",
    bgColor: "bg-zinc-50",
    borderColor: "border-zinc-300",
    icon: "↩️",
    seller: {
      action: null,
      message: "Los fondos han sido reembolsados.",
    },
    buyer: {
      action: null,
      message: "Los fondos han sido reembolsados al seller.",
    },
  },
};

/**
 * Rol efectivo según la oferta: SELL = maker vende (seller), BUY = maker compra (buyer).
 * Así se muestra correctamente tanto órdenes antiguas como nuevas.
 */
function getEffectiveBuyerAndSellerIds(order: Order): {
  effectiveBuyerId: string;
  effectiveSellerId: string;
} {
  const offer = order.offer;
  const makerId = offer?.makerId;
  const side = offer?.side;
  if (makerId && (side === "BUY" || side === "SELL")) {
    const effectiveBuyerId =
      side === "BUY" ? makerId : order.buyerId === makerId ? order.sellerId : order.buyerId;
    const effectiveSellerId =
      side === "BUY" ? (order.buyerId === makerId ? order.sellerId : order.buyerId) : makerId;
    return { effectiveBuyerId, effectiveSellerId };
  }
  return { effectiveBuyerId: order.buyerId, effectiveSellerId: order.sellerId };
}

/**
 * Helper para obtener el rol del usuario (por oferta: BUY = maker comprador, SELL = maker vendedor).
 */
export function getUserRole(userId: string | undefined, order: Order): UserRole {
  if (!userId) return "spectator";
  const { effectiveBuyerId, effectiveSellerId } = getEffectiveBuyerAndSellerIds(order);
  if (effectiveSellerId === userId) return "seller";
  if (effectiveBuyerId === userId) return "buyer";
  return "spectator";
}

/**
 * Helper para obtener la configuración del estado actual
 */
export function getStatusConfig(status: OrderStatus): StatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.CREATED;
}
