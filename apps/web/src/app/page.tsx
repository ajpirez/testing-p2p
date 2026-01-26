/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreateOfferInput, PaymentMethodType } from "@p2p/shared";

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const [userId, setUserId] = useState<string | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [takeAmount, setTakeAmount] = useState<string>("50");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateOfferInput>({
    side: "SELL",
    asset: "USDT",
    fiat: "EUR",
    price: 1.0,
    minAmount: 10,
    maxAmount: 200,
    paymentMethods: ["BANK_TRANSFER"],
  });

  const paymentOptions: PaymentMethodType[] = useMemo(
    () => ["BANK_TRANSFER", "BIZUM", "PAYPAL", "CASH"],
    [],
  );

  useEffect(() => {
    const stored = localStorage.getItem("p2p_user_id");
    if (stored) setUserId(stored);
  }, []);

  async function devLogin() {
    const res = await fetch(`${apiBase}/auth/dev-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    localStorage.setItem("p2p_user_id", data.user.id);
    setUserId(data.user.id);
  }

  async function loadOffers() {
    const res = await fetch(`${apiBase}/offers`);
    const data = await res.json();
    setOffers(Array.isArray(data) ? data : []);
    if (!selectedOfferId && Array.isArray(data) && data.length > 0) {
      setSelectedOfferId(data[0].id);
    }
  }

  async function createOffer() {
    if (!userId) throw new Error("No userId");
    const res = await fetch(`${apiBase}/offers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    await loadOffers();
  }

  async function takeOffer() {
    if (!userId) throw new Error("No userId");
    const res = await fetch(`${apiBase}/offers/take`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        offerId: selectedOfferId,
        amount: Number(takeAmount),
      }),
    });
    const data = await res.json();
    setCreatedOrderId(data.id ?? null);
    await loadOffers();
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">P2P Exchange (local)</h1>
          <p className="text-sm text-zinc-600">
            API: <span className="font-mono">{apiBase}</span>
          </p>
        </header>

        <section className="rounded-xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <div className="text-zinc-600">User ID</div>
              <div className="font-mono">{userId ?? "(no login)"}</div>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                onClick={devLogin}
              >
                Dev login
              </button>
              <button
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                onClick={loadOffers}
              >
                Refresh offers
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border bg-white p-4">
            <h2 className="text-lg font-semibold">Create offer</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Side</span>
                <select
                  className="rounded-lg border p-2"
                  value={form.side}
                  onChange={(e) => setForm((f) => ({ ...f, side: e.target.value as any }))}
                >
                  <option value="SELL">SELL</option>
                  <option value="BUY">BUY</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Asset</span>
                <select
                  className="rounded-lg border p-2"
                  value={form.asset}
                  onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value as any }))}
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Fiat</span>
                <select
                  className="rounded-lg border p-2"
                  value={form.fiat}
                  onChange={(e) => setForm((f) => ({ ...f, fiat: e.target.value as any }))}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Price</span>
                <input
                  className="rounded-lg border p-2"
                  value={String(form.price)}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Min</span>
                <input
                  className="rounded-lg border p-2"
                  value={String(form.minAmount)}
                  onChange={(e) => setForm((f) => ({ ...f, minAmount: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Max</span>
                <input
                  className="rounded-lg border p-2"
                  value={String(form.maxAmount)}
                  onChange={(e) => setForm((f) => ({ ...f, maxAmount: Number(e.target.value) }))}
                />
              </label>
              <div className="col-span-2">
                <div className="text-zinc-600">Payment methods</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paymentOptions.map((pm) => {
                    const checked = form.paymentMethods.includes(pm);
                    return (
                      <label key={pm} className="flex items-center gap-2 rounded-full border px-3 py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((f) => ({
                              ...f,
                              paymentMethods: e.target.checked
                                ? [...f.paymentMethods, pm]
                                : f.paymentMethods.filter((x) => x !== pm),
                            }));
                          }}
                        />
                        <span className="font-mono text-xs">{pm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              className="mt-4 w-full rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
              onClick={() => createOffer().catch((e) => alert(String(e)))}
              disabled={!userId}
            >
              Create offer
            </button>
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h2 className="text-lg font-semibold">Take offer</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Offer</span>
                <select
                  className="rounded-lg border p-2 font-mono text-xs"
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                >
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id.slice(0, 8)}… {o.side} {o.asset}/{o.fiat} price={String(o.price)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-zinc-600">Amount</span>
                <input
                  className="rounded-lg border p-2"
                  value={takeAmount}
                  onChange={(e) => setTakeAmount(e.target.value)}
                />
              </label>
              <button
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                onClick={() => takeOffer().catch((e) => alert(String(e)))}
                disabled={!userId || !selectedOfferId}
              >
                Take
              </button>

              {createdOrderId ? (
                <div className="rounded-lg border bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-600">Created order</div>
                  <div className="font-mono text-sm">{createdOrderId}</div>
                  <a className="mt-2 inline-block text-sm underline" href={`/orders/${createdOrderId}`}>
                    Open order page
                  </a>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Offers (active)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="py-2">id</th>
                  <th>side</th>
                  <th>asset</th>
                  <th>fiat</th>
                  <th>price</th>
                  <th>min</th>
                  <th>max</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="py-2 font-mono text-xs">{o.id}</td>
                    <td>{o.side}</td>
                    <td>{o.asset}</td>
                    <td>{o.fiat}</td>
                    <td>{String(o.price)}</td>
                    <td>{String(o.minAmount)}</td>
                    <td>{String(o.maxAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
