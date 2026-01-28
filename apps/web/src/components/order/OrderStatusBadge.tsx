"use client";

import { type OrderStatus, getStatusConfig } from "@/types/order";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md" | "lg";
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Orden Creada",
  FUNDS_LOCKED: "Fondos Bloqueados",
  PAYMENT_MARKED: "Pago Confirmado",
  RELEASED: "Fondos Liberados",
  COMPLETED: "Completado",
  DISPUTED: "En Disputa",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export function OrderStatusBadge({
  status,
  size = "md",
}: OrderStatusBadgeProps) {
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${config.bgColor} ${config.color} ${config.borderColor} border
        ${sizeClasses[size]}
      `}
    >
      <span>{config.icon}</span>
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
}
