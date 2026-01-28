/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreateOfferInput, PaymentMethodType } from "@p2p/shared";

type LocalUser = {
  id: string;
  email: string | null;
  walletAddress?: string | null;
};

type Order = {
  id: string;
  status: string;
  amount: number;
  buyerId: string;
  sellerId: string;
};

type Offer = {
  id: string;
  makerId: string;
  side: "SELL" | "BUY";
  asset: string;
  fiat: string;
  price: number;
  minAmount: number;
  maxAmount: number;
  paymentMethods: string[];
};

export default function Home() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const [user, setUser] = useState<LocalUser | null>(null);
  const [email, setEmail] = useState<string>("alice@example.com");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [takeAmount, setTakeAmount] = useState<string>("0.01");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

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

  // Cargar ofertas y órdenes al tener usuario
  useEffect(() => {
    if (user?.id) {
      loadOffers();
      loadMyOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function devLoginWithEmail() {
    setLoading("login");
    try {
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
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  function logout() {
    localStorage.removeItem("p2p_user_id");
    localStorage.removeItem("p2p_user");
    setUser(null);
    setMyOrders([]);
  }

  async function loadOffers() {
    const res = await fetch(`${apiBase}/offers`);
    const data = await res.json();
    const list: Offer[] = Array.isArray(data) ? data : [];
    setOffers(list);
    if (!selectedOfferId && list.length > 0) {
      // Preseleccionar la primera oferta que no sea propia
      const firstNonSelf = list.find((o) => o.makerId !== user?.id);
      setSelectedOfferId((firstNonSelf ?? list[0]).id);
    }
  }

  async function loadMyOrders() {
    if (!user?.id) return;
    try {
      const res = await fetch(`${apiBase}/orders/my`, {
        headers: { "x-user-id": user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setMyOrders(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore - endpoint might not exist
    }
  }

  async function createOffer() {
    if (!user?.id) throw new Error("No user");
    setLoading("create");
    try {
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
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function takeOffer() {
    if (!user?.id) throw new Error("No user");
    if (isOwnSelectedOffer) {
      alert("No puedes tomar tu propia oferta");
      return;
    }
    setLoading("take");
    try {
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
      if (!res.ok) {
        throw new Error(data.message || "Error taking offer");
      }
      setCreatedOrderId(data.id ?? null);
      await loadOffers();
      await loadMyOrders();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CREATED: "bg-amber-100 text-amber-700 border-amber-200",
      FUNDS_LOCKED: "bg-blue-100 text-blue-700 border-blue-200",
      PAYMENT_MARKED: "bg-orange-100 text-orange-700 border-orange-200",
      RELEASED: "bg-emerald-100 text-emerald-700 border-emerald-200",
      COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
      DISPUTED: "bg-red-100 text-red-700 border-red-200",
      CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    };
    return colors[status] || colors.CREATED;
  };

  const selectedOffer = offers.find((o) => o.id === selectedOfferId);
  const isOwnSelectedOffer =
    selectedOffer && user?.id && selectedOffer.makerId === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Header */}
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-zinc-900">P2P Exchange</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Plataforma de intercambio P2P local • API:{" "}
            <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">
              {apiBase}
            </code>
          </p>
        </header>

        {/* Login/User Section */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white text-xl font-bold">
                  {(user.email || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-zinc-900">
                    {user.email || "Usuario"}
                  </div>
                  <div className="font-mono text-xs text-zinc-500 truncate max-w-[200px]">
                    {user.walletAddress || user.id.slice(0, 16) + "..."}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500">
                No has iniciado sesión
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                className="flex-1 min-w-[180px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="email@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                onClick={devLoginWithEmail}
                disabled={loading === "login"}
              >
                {loading === "login" ? (
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : null}
                Iniciar Sesión
              </button>
              {user && (
                <button
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  onClick={logout}
                >
                  Cerrar Sesión
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Quick Access: My Orders */}
        {user && myOrders.length > 0 && (
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">
              Mis Órdenes Activas
            </h2>
            <div className="flex flex-wrap gap-2">
              {myOrders.slice(0, 5).map((order) => (
                <a
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100 transition-colors"
                >
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <span className="font-mono text-zinc-600">
                    {order.id.slice(0, 8)}...
                  </span>
                  <span className="text-zinc-400">→</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Offer */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Crear Oferta
              </h2>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  form.side === "SELL"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {form.side === "SELL" ? "Vender" : "Comprar"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">Tipo</span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={form.side}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      side: e.target.value as "SELL" | "BUY",
                    }))
                  }
                >
                  <option value="SELL">SELL (Vender)</option>
                  <option value="BUY">BUY (Comprar)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">Asset</span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={form.asset}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      asset: e.target.value as "USDT" | "USDC",
                    }))
                  }
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">
                  Moneda Fiat
                </span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={form.fiat}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fiat: e.target.value as "EUR" | "USD",
                    }))
                  }
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">
                  Precio
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={String(form.price)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: Number(e.target.value) }))
                  }
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">
                  Mínimo
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={String(form.minAmount)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minAmount: Number(e.target.value),
                    }))
                  }
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">
                  Máximo
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={String(form.maxAmount)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxAmount: Number(e.target.value),
                    }))
                  }
                />
              </label>

              <div className="col-span-2">
                <span className="text-xs font-medium text-zinc-600">
                  Métodos de Pago
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paymentOptions.map((pm) => {
                    const checked = form.paymentMethods.includes(pm);
                    return (
                      <label
                        key={pm}
                        className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          checked
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          className="sr-only"
                          onChange={(e) => {
                            setForm((f) => ({
                              ...f,
                              paymentMethods: e.target.checked
                                ? [...f.paymentMethods, pm]
                                : f.paymentMethods.filter((x) => x !== pm),
                            }));
                          }}
                        />
                        {pm.replace("_", " ")}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              onClick={createOffer}
              disabled={!user?.id || loading === "create"}
            >
              {loading === "create" ? (
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : null}
              Crear Oferta
            </button>
          </section>

          {/* Take Offer */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              Tomar Oferta
            </h2>

            <div className="space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">
                  Seleccionar Oferta
                </span>
                <select
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 font-mono text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                >
                  <option value="">-- Selecciona una oferta --</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.side} {o.asset}/{o.fiat} @ {String(o.price)} •{" "}
                      {o.id.slice(0, 8)}…{" "}
                      {user?.id === o.makerId ? "(tu oferta)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600">
                  Cantidad (ETH)
                </span>
                <input
                  type="number"
                  step="0.001"
                  className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  value={takeAmount}
                  onChange={(e) => setTakeAmount(e.target.value)}
                />
              </label>

              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                onClick={takeOffer}
                disabled={
                  !user?.id ||
                  !selectedOfferId ||
                  loading === "take" ||
                  Boolean(isOwnSelectedOffer)
                }
              >
                {loading === "take" ? (
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : null}
                Tomar Oferta
              </button>

              {createdOrderId && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-medium">¡Orden creada!</span>
                  </div>
                  <div className="font-mono text-sm text-emerald-800 mb-2">
                    {createdOrderId}
                  </div>
                  <a
                    href={`/orders/${createdOrderId}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Ver orden
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Offers Table */}
        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-3">
            <h2 className="text-lg font-semibold text-zinc-900">
              Ofertas Disponibles
            </h2>
            <button
              onClick={loadOffers}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Actualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    ID
                  </th>
                  <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Tipo
                  </th>
                  <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Par
                  </th>
                  <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Precio
                  </th>
                  <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Límites
                  </th>
                  <th className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Métodos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {offers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-zinc-400"
                    >
                      No hay ofertas disponibles
                    </td>
                  </tr>
                ) : (
                  offers.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="py-3 px-5 font-mono text-sm text-zinc-700">
                        {o.id.slice(0, 8)}…
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            o.side === "SELL"
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {o.side}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm font-medium text-zinc-900">
                        {o.asset}/{o.fiat}
                      </td>
                      <td className="py-3 px-5 text-sm text-zinc-700">
                        {String(o.price)}
                      </td>
                      <td className="py-3 px-5 text-sm text-zinc-500">
                        {String(o.minAmount)} - {String(o.maxAmount)}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-1">
                          {(o.paymentMethods || [])
                            .slice(0, 2)
                            .map((pm: string) => (
                              <span
                                key={pm}
                                className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600"
                              >
                                {pm}
                              </span>
                            ))}
                          {(o.paymentMethods || []).length > 2 && (
                            <span className="text-xs text-zinc-400">
                              +{o.paymentMethods.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
