/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreateOfferInput, PaymentMethodType } from "@p2p/shared";

type LocalUser = {
  id: string;
  email: string | null;
  walletAddress?: string | null;
};

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const [user, setUser] = useState<LocalUser | null>(null);
  const [email, setEmail] = useState<string>("alice@example.com");
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [takeAmount, setTakeAmount] = useState<string>("0.01");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateOfferInput>({
    side: "SELL",
    asset: "USDT",
    fiat: "EUR",
    price: 1.0,
    minAmount: 0.01,
    maxAmount: 1,
    paymentMethods: ["BANK_TRANSFER"],
  });

  const paymentOptions: PaymentMethodType[] = useMemo(
    () => ["BANK_TRANSFER", "BIZUM", "PAYPAL", "CASH"],
    [],
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("p2p_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as LocalUser;
        if (parsed?.id) setUser(parsed);
        if (parsed?.email) setEmail(parsed.email);
      } catch {
        // ignore
      }
    } else {
      const storedId = localStorage.getItem("p2p_user_id");
      if (storedId) setUser({ id: storedId, email: null });
    }
  }, []);

  async function devLoginWithEmail() {
    const res = await fetch(`${apiBase}/auth/dev-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    localStorage.setItem("p2p_user_id", data.user.id);
    localStorage.setItem("p2p_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("p2p_user_id");
    localStorage.removeItem("p2p_user");
    setUser(null);
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
    if (!user?.id) throw new Error("No user");
    const res = await fetch(`${apiBase}/offers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": user.id,
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
    if (!user?.id) throw new Error("No user");
    const res = await fetch(`${apiBase}/offers/take`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": user.id,
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
          <h1 className="text-3xl font-bold text-zinc-900">P2P Exchange (local)</h1>
          <p className="text-sm text-zinc-600">
            API: <span className="font-mono text-zinc-800">{apiBase}</span>
          </p>
        </header>

        <section className="rounded-xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <div className="font-medium text-zinc-700">User ID</div>
              <div className="font-mono text-zinc-900">{user?.id ?? "(no login)"}</div>
              {user?.walletAddress ? (
                <div className="mt-1 font-mono text-xs text-zinc-600">{user.walletAddress}</div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 gap-2">
                <input
                  className="w-full min-w-[220px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                  onClick={() => devLoginWithEmail().catch((e) => alert(String(e)))}
                >
                  Login
                </button>
                <button
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:border-zinc-400"
                  onClick={logout}
                  disabled={!user}
                >
                  Logout
                </button>
              </div>
              <button
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:border-zinc-400"
                onClick={loadOffers}
              >
                Refresh offers
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border bg-white p-4">
            <h2 className="text-lg font-semibold text-zinc-900">Create offer</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">Side</span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={form.side}
                  onChange={(e) => setForm((f) => ({ ...f, side: e.target.value as any }))}
                >
                  <option value="SELL">SELL</option>
                  <option value="BUY">BUY</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">Asset</span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={form.asset}
                  onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value as any }))}
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">Fiat</span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={form.fiat}
                  onChange={(e) => setForm((f) => ({ ...f, fiat: e.target.value as any }))}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">Price</span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={String(form.price)}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">Min</span>
                <input
                  type="number"
                  className="rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={String(form.minAmount)}
                  onChange={(e) => setForm((f) => ({ ...f, minAmount: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">Max</span>
                <input
                  type="number"
                  className="rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={String(form.maxAmount)}
                  onChange={(e) => setForm((f) => ({ ...f, maxAmount: Number(e.target.value) }))}
                />
              </label>
              <div className="col-span-2">
                <div className="text-sm font-medium text-zinc-700">Payment methods</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paymentOptions.map((pm) => {
                    const checked = form.paymentMethods.includes(pm);
                    return (
                      <label
                        key={pm}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          checked
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          className="h-3.5 w-3.5"
                          onChange={(e) => {
                            setForm((f) => ({
                              ...f,
                              paymentMethods: e.target.checked
                                ? [...f.paymentMethods, pm]
                                : f.paymentMethods.filter((x) => x !== pm),
                            }));
                          }}
                        />
                        <span className="font-mono">{pm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              className="mt-4 w-full rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
              onClick={() => createOffer().catch((e) => alert(String(e)))}
                disabled={!user?.id}
            >
              Create offer
            </button>
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h2 className="text-lg font-semibold text-zinc-900">Take offer</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">Offer</span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2 font-mono text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
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
                <span className="text-sm font-medium text-zinc-700">Amount</span>
                <input
                  type="number"
                  className="rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={takeAmount}
                  onChange={(e) => setTakeAmount(e.target.value)}
                />
              </label>
              <button
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                onClick={() => takeOffer().catch((e) => alert(String(e)))}
                disabled={!user?.id || !selectedOfferId}
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
          <h2 className="text-lg font-semibold text-zinc-900">Offers (active)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">id</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">side</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">asset</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">fiat</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">price</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">min</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {offers.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50">
                    <td className="py-3 px-4 font-mono text-sm text-zinc-900">{o.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-zinc-900">{o.side}</td>
                    <td className="py-3 px-4 text-sm text-zinc-900">{o.asset}</td>
                    <td className="py-3 px-4 text-sm text-zinc-900">{o.fiat}</td>
                    <td className="py-3 px-4 text-sm text-zinc-900">{String(o.price)}</td>
                    <td className="py-3 px-4 text-sm text-zinc-900">{String(o.minAmount)}</td>
                    <td className="py-3 px-4 text-sm text-zinc-900">{String(o.maxAmount)}</td>
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
