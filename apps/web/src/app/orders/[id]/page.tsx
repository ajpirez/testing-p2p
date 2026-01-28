"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import {
  OrderTimeline,
  OrderStatusBadge,
  RoleIndicator,
  OrderStatusMessage,
  OrderActions,
  OrderDetailsCard,
} from "@/components/order";
import { type Order, type OrderStatus, getUserRole } from "@/types/order";

type LocalUser = {
  id: string;
  email: string | null;
  walletAddress?: string | null;
};

const POLL_INTERVAL = 5000; // 5 segundos

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";

  const [user, setUser] = useState<LocalUser | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar usuario del localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("p2p_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as LocalUser;
        if (parsed?.id) setUser(parsed);
      } catch {
        // ignore
      }
    } else {
      const storedId = localStorage.getItem("p2p_user_id");
      if (storedId) setUser({ id: storedId, email: null });
    }
  }, []);

  // Función para cargar la orden
  const loadOrder = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${apiBase}/orders/${id}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrder(data);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [apiBase, id]);

  // Polling automático
  useEffect(() => {
    loadOrder();

    const poll = () => {
      const terminalStatuses: OrderStatus[] = [
        "RELEASED",
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ];
      if (
        isPolling &&
        !terminalStatuses.includes((order?.status as OrderStatus) ?? "CREATED")
      ) {
        pollTimeoutRef.current = setTimeout(() => {
          loadOrder().finally(poll);
        }, POLL_INTERVAL);
      }
    };

    poll();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [loadOrder, isPolling, order?.status]);

  // Determinar rol del usuario
  const role = order ? getUserRole(user?.id, order) : "spectator";

  // Handlers para acciones
  async function lockFunds() {
    if (!user?.id) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${id}/lock-funds`, {
      method: "POST",
      headers: { "x-user-id": user.id },
    });
    if (!res.ok) throw new Error(await res.text());
    await loadOrder();
  }

  async function markPaid() {
    if (!user?.id) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${id}/mark-paid`, {
      method: "POST",
      headers: { "x-user-id": user.id },
    });
    if (!res.ok) throw new Error(await res.text());
    await loadOrder();
  }

  async function release() {
    if (!user?.id) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${id}/release`, {
      method: "POST",
      headers: { "x-user-id": user.id },
    });
    if (!res.ok) throw new Error(await res.text());
    await loadOrder();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver al inicio
            </a>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">Orden P2P</h1>
          </div>
          {order && (
            <OrderStatusBadge status={order.status as OrderStatus} size="lg" />
          )}
        </header>

        {/* User Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-xl">
              {role === "seller" ? "💰" : role === "buyer" ? "🛒" : "👤"}
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-900">
                {user?.email || user?.id?.slice(0, 8) || "No logueado"}
              </div>
              {user?.walletAddress && (
                <div
                  className="font-mono text-xs text-zinc-500 truncate max-w-[200px]"
                  title={user.walletAddress}
                >
                  {user.walletAddress}
                </div>
              )}
            </div>
          </div>
          {order && <RoleIndicator role={role} />}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">❌</span>
              <div>
                <div className="font-medium text-red-800">Error</div>
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Order Content */}
        {order ? (
          <>
            {/* Timeline */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <OrderTimeline status={order.status as OrderStatus} />
            </div>

            {/* Status Message */}
            <OrderStatusMessage order={order} role={role} />

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
              <OrderActions
                order={order}
                role={role}
                onLockFunds={lockFunds}
                onMarkPaid={markPaid}
                onRelease={release}
                onRefresh={loadOrder}
              />

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {lastUpdate && (
                  <span>Actualizado: {lastUpdate.toLocaleTimeString()}</span>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPolling}
                    onChange={(e) => setIsPolling(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-300"
                  />
                  <span>Auto-refresh</span>
                </label>
              </div>
            </div>

            {/* Order Details */}
            <OrderDetailsCard order={order} role={role} />

            {/* Order ID (collapsible) */}
            <details className="rounded-xl border border-zinc-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Información Técnica
              </summary>
              <div className="border-t border-zinc-100 px-4 py-3 space-y-2">
                <div>
                  <div className="text-xs font-medium text-zinc-500">
                    Order ID
                  </div>
                  <div className="font-mono text-xs text-zinc-700 break-all">
                    {order.id}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500">
                    Seller ID
                  </div>
                  <div className="font-mono text-xs text-zinc-700 break-all">
                    {order.sellerId}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500">
                    Buyer ID
                  </div>
                  <div className="font-mono text-xs text-zinc-700 break-all">
                    {order.buyerId}
                  </div>
                </div>
                {order.createdAt && (
                  <div>
                    <div className="text-xs font-medium text-zinc-500">
                      Creado
                    </div>
                    <div className="text-xs text-zinc-700">
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <div className="animate-spin h-8 w-8 mx-auto mb-3 border-2 border-zinc-300 border-t-zinc-600 rounded-full" />
            <div className="text-sm text-zinc-500">Cargando orden...</div>
          </div>
        )}
      </div>
    </div>
  );
}
