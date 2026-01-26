"use client";

import { useEffect, useState } from "react";

type LocalUser = {
  id: string;
  email: string | null;
  walletAddress?: string | null;
};

export default function OrderPage({ params }: { params: { id: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const [user, setUser] = useState<LocalUser | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function load() {
    setError(null);
    const res = await fetch(`${apiBase}/orders/${params.id}`);
    if (!res.ok) throw new Error(await res.text());
    setOrder(await res.json());
  }

  useEffect(() => {
    load().catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const isBuyer = Boolean(user?.id && order?.buyerId === user.id);
  const isSeller = Boolean(user?.id && order?.sellerId === user.id);

  async function lockFunds() {
    if (!user?.id) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${params.id}/lock-funds`, {
      method: "POST",
      headers: { "x-user-id": user.id },
    });
    if (!res.ok) throw new Error(await res.text());
    await load();
  }

  async function markPaid() {
    if (!user?.id) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${params.id}/mark-paid`, {
      method: "POST",
      headers: { "x-user-id": user.id },
    });
    if (!res.ok) throw new Error(await res.text());
    await load();
  }

  async function release() {
    if (!user?.id) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${params.id}/release`, {
      method: "POST",
      headers: { "x-user-id": user.id },
    });
    if (!res.ok) throw new Error(await res.text());
    await load();
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <a className="text-sm underline" href="/">
          ← Back
        </a>
        <h1 className="text-3xl font-bold text-zinc-900">Order</h1>
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="text-xs font-medium text-zinc-600">Order ID</div>
          <div className="font-mono text-zinc-900">{params.id}</div>
          <div className="mt-3 text-xs font-medium text-zinc-600">User</div>
          <div className="font-mono text-zinc-900">{user?.id ?? "(no login)"}</div>
          {user?.walletAddress ? (
            <div className="mt-1 font-mono text-xs text-zinc-600">{user.walletAddress}</div>
          ) : null}
        </div>

        {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-600">{error}</div> : null}

        {order ? (
          <div className="rounded-xl border bg-white p-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
                status: <span className="font-mono text-zinc-900">{order.status}</span>
              </span>
              {isBuyer ? (
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                  you are buyer
                </span>
              ) : null}
              {isSeller ? (
                <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
                  you are seller
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-zinc-600">Amount (ETH)</div>
                <div className="font-mono text-zinc-900">{String(order.amount)}</div>
              </div>
              <div>
                <div className="text-zinc-600">Escrow key</div>
                <div className="font-mono text-xs text-zinc-900">{order.escrowOrderId ?? "(not set yet)"}</div>
              </div>
              <div>
                <div className="text-zinc-600">Buyer</div>
                <div className="font-mono text-xs text-zinc-900">{order.buyerId}</div>
                {order.buyer?.walletAddress ? (
                  <div className="font-mono text-xs text-zinc-600">{order.buyer.walletAddress}</div>
                ) : null}
              </div>
              <div>
                <div className="text-zinc-600">Seller</div>
                <div className="font-mono text-xs text-zinc-900">{order.sellerId}</div>
                {order.seller?.walletAddress ? (
                  <div className="font-mono text-xs text-zinc-600">{order.seller.walletAddress}</div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {order.fundTxHash ? (
                <div className="rounded-lg border bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-600">Fund tx</div>
                  <div className="font-mono text-xs text-zinc-900">{order.fundTxHash}</div>
                </div>
              ) : null}
              {order.releaseTxHash ? (
                <div className="rounded-lg border bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-600">Release tx</div>
                  <div className="font-mono text-xs text-zinc-900">{order.releaseTxHash}</div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:border-zinc-400"
                onClick={() => load().catch((e) => alert(String(e)))}
              >
                Refresh
              </button>

              {isSeller && order.status === "CREATED" ? (
                <button
                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                  onClick={() => lockFunds().catch((e) => alert(String(e)))}
                >
                  Lock funds (on-chain)
                </button>
              ) : null}

              {isBuyer && (order.status === "CREATED" || order.status === "FUNDS_LOCKED") ? (
                <button
                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                  onClick={() => markPaid().catch((e) => alert(String(e)))}
                >
                  Mark paid (buyer)
                </button>
              ) : null}

              {isSeller && order.status === "PAYMENT_MARKED" ? (
                <button
                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                  onClick={() => release().catch((e) => alert(String(e)))}
                >
                  Release (on-chain)
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4 text-sm">Loading…</div>
        )}
      </div>
    </div>
  );
}

