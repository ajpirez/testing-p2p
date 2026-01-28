"use client";

import { type Order, type UserRole, getStatusConfig } from "@/types/order";

interface OrderStatusMessageProps {
  order: Order;
  role: UserRole;
}

export function OrderStatusMessage({ order, role }: OrderStatusMessageProps) {
  const config = getStatusConfig(order.status);
  const roleConfig = role === "seller" ? config.seller : config.buyer;

  // Para espectadores, mostrar un mensaje genérico
  if (role === "spectator") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className="text-sm text-zinc-600">
              Estás viendo esta orden como espectador. No tienes acciones
              disponibles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isWaiting = roleConfig.action === null;
  const showPaymentInfo =
    roleConfig.showPaymentInfo && order.seller?.walletAddress;

  return (
    <div
      className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">
          {isWaiting ? "⏳" : config.icon}
        </span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.color}`}>
            {roleConfig.message}
          </p>

          {/* Mostrar info de pago para el buyer */}
          {showPaymentInfo && (
            <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs font-medium text-zinc-500 mb-1">
                Datos del Seller para el pago:
              </div>
              <div className="font-mono text-sm text-zinc-900 break-all">
                Wallet: {order.seller?.walletAddress}
              </div>
              {order.seller?.email && (
                <div className="text-sm text-zinc-700 mt-1">
                  Email: {order.seller.email}
                </div>
              )}
              {order.offer?.paymentMethods && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {order.offer.paymentMethods.map((pm) => (
                    <span
                      key={pm}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                    >
                      {pm}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Indicador de espera */}
          {isWaiting && order.status !== "COMPLETED" && (
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Actualizando automáticamente...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
