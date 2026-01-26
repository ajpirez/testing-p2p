"use client";

import { useEffect, useState } from "react";

export default function OrderPage({ params }: { params: { id: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const [userId, setUserId] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("p2p_user_id"));
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

  async function markPaid() {
    if (!userId) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${params.id}/mark-paid`, {
      method: "POST",
      headers: { "x-user-id": userId },
    });
    if (!res.ok) throw new Error(await res.text());
    await load();
  }

  async function release() {
    if (!userId) throw new Error("No userId");
    const res = await fetch(`${apiBase}/orders/${params.id}/release`, {
      method: "POST",
      headers: { "x-user-id": userId },
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
        <h1 className="text-2xl font-semibold">Order</h1>
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="text-zinc-600">Order ID</div>
          <div className="font-mono">{params.id}</div>
          <div className="mt-3 text-zinc-600">User ID</div>
          <div className="font-mono">{userId ?? "(no login)"}</div>
        </div>

        {error ? <div className="rounded-xl border bg-white p-4 text-sm text-red-600">{error}</div> : null}

        {order ? (
          <div className="rounded-xl border bg-white p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-zinc-600">Status</div>
                <div className="font-mono">{order.status}</div>
              </div>
              <div>
                <div className="text-zinc-600">Amount</div>
                <div className="font-mono">{String(order.amount)}</div>
              </div>
              <div>
                <div className="text-zinc-600">Buyer</div>
                <div className="font-mono text-xs">{order.buyerId}</div>
              </div>
              <div>
                <div className="text-zinc-600">Seller</div>
                <div className="font-mono text-xs">{order.sellerId}</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="rounded-lg border px-3 py-2" onClick={() => load().catch((e) => alert(String(e)))}>
                Refresh
              </button>
              <button className="rounded-lg bg-black px-3 py-2 text-white" onClick={() => markPaid().catch((e) => alert(String(e)))}>
                Mark paid (buyer)
              </button>
              <button className="rounded-lg bg-black px-3 py-2 text-white" onClick={() => release().catch((e) => alert(String(e)))}>
                Release (seller)
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4 text-sm">Loading…</div>
        )}
      </div>
    </div>
  );
}

