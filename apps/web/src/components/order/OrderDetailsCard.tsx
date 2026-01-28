"use client";

import { type Order, type UserRole } from "@/types/order";

interface OrderDetailsCardProps {
  order: Order;
  role: UserRole;
}

export function OrderDetailsCard({ order, role }: OrderDetailsCardProps) {
  const counterparty = role === "seller" ? order.buyer : order.seller;
  const counterpartyLabel = role === "seller" ? "Comprador" : "Vendedor";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-700">
          Detalles de la Orden
        </h3>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Monto */}
          <div>
            <div className="text-xs font-medium text-zinc-500">Monto</div>
            <div className="mt-1 text-lg font-bold text-zinc-900">
              {String(order.amount)} ETH
            </div>
            {order.offer && (
              <div className="text-xs text-zinc-500">
                @ {order.offer.price} {order.offer.fiat}/{order.offer.asset}
              </div>
            )}
          </div>

          {/* Contraparte */}
          <div>
            <div className="text-xs font-medium text-zinc-500">
              {counterpartyLabel}
            </div>
            {counterparty ? (
              <div className="mt-1">
                <div className="text-sm font-medium text-zinc-900 truncate">
                  {counterparty.email || "Usuario anónimo"}
                </div>
                {counterparty.walletAddress && (
                  <div
                    className="font-mono text-xs text-zinc-500 truncate"
                    title={counterparty.walletAddress}
                  >
                    {counterparty.walletAddress.slice(0, 10)}...
                    {counterparty.walletAddress.slice(-8)}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm text-zinc-400">-</div>
            )}
          </div>

          {/* Escrow Key */}
          {order.escrowOrderId && (
            <div className="col-span-2">
              <div className="text-xs font-medium text-zinc-500">
                Escrow Key (on-chain)
              </div>
              <div className="mt-1 font-mono text-xs text-zinc-700 bg-zinc-50 rounded px-2 py-1 break-all">
                {order.escrowOrderId}
              </div>
            </div>
          )}
        </div>

        {/* Transactions */}
        {(order.fundTxHash || order.releaseTxHash) && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="text-xs font-medium text-zinc-500 mb-2">
              Transacciones Blockchain
            </div>
            <div className="space-y-2">
              {order.fundTxHash && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                  <span className="text-blue-500">🔒</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-blue-700">
                      Fund TX
                    </div>
                    <div
                      className="font-mono text-xs text-blue-600 truncate"
                      title={order.fundTxHash}
                    >
                      {order.fundTxHash}
                    </div>
                  </div>
                </div>
              )}
              {order.releaseTxHash && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <span className="text-emerald-500">✅</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-emerald-700">
                      Release TX
                    </div>
                    <div
                      className="font-mono text-xs text-emerald-600 truncate"
                      title={order.releaseTxHash}
                    >
                      {order.releaseTxHash}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
