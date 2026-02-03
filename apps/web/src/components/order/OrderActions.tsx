"use client";

import { useState } from "react";
import {
  type AllowanceCheck,
  type Order,
  type UserRole,
  getStatusConfig,
} from "@/types/order";

interface OrderActionsProps {
  order: Order;
  role: UserRole;
  allowanceCheck?: AllowanceCheck;
  onApproveToken?: () => Promise<void>;
  approveLoading?: boolean;
  onLockFunds: () => Promise<void>;
  onMarkPaid: () => Promise<void>;
  onRelease: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function OrderActions({
  order,
  role,
  allowanceCheck,
  onApproveToken,
  approveLoading = false,
  onLockFunds,
  onMarkPaid,
  onRelease,
  onRefresh,
}: OrderActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const needsApprove =
    role === "seller" &&
    allowanceCheck &&
    !allowanceCheck.notApplicable &&
    !allowanceCheck.sufficient &&
    "asset" in allowanceCheck;

  const config = getStatusConfig(order.status);
  const roleConfig = role === "seller" ? config.seller : config.buyer;

  const handleAction = async (
    actionName: string,
    handler: () => Promise<void>
  ) => {
    setLoading(actionName);
    try {
      await handler();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(null);
    }
  };

  const getButtonStyles = (variant: string = "primary") => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    switch (variant) {
      case "success":
        return `${base} bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200`;
      case "warning":
        return `${base} bg-amber-500 text-white hover:bg-amber-600 focus:ring-2 focus:ring-amber-200`;
      case "danger":
        return `${base} bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-200`;
      case "secondary":
        return `${base} bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50 focus:ring-2 focus:ring-zinc-200`;
      default:
        return `${base} bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-200`;
    }
  };

  // Si no hay acción disponible o es espectador, solo mostrar refresh
  const hasAction = role !== "spectator" && roleConfig.action !== null;

  return (
    <div className="flex flex-wrap gap-3">
      {/* Botón de refresh siempre visible */}
      <button
        className={getButtonStyles("secondary")}
        onClick={() => handleAction("refresh", onRefresh)}
        disabled={loading !== null}
      >
        {loading === "refresh" ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
        ) : (
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
        Actualizar
      </button>

      {/* Aprobar token ERC-20 (USDT/USDC) antes de Lock funds si hace falta */}
      {hasAction &&
        roleConfig.action === "lock-funds" &&
        needsApprove &&
        onApproveToken && (
          <>
            <p className="w-full text-xs text-zinc-500 sm:w-auto">
              Con USDT/USDC debes autorizar al escrow una vez en tu wallet;
              después podrás bloquear fondos.
            </p>
            <button
              className={getButtonStyles("warning")}
              onClick={() => handleAction("approve", onApproveToken)}
              disabled={loading !== null || approveLoading}
            >
              {loading === "approve" || approveLoading ? (
                <>
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
                  <span>Aprobando...</span>
                </>
              ) : (
                <>
                  <span>
                    Aprobar{" "}
                    {"asset" in (allowanceCheck ?? {})
                      ? (allowanceCheck as { asset: string }).asset
                      : "token"}
                  </span>
                </>
              )}
            </button>
          </>
        )}

      {/* Acción principal según el rol y estado */}
      {hasAction && roleConfig.action === "lock-funds" && !needsApprove && (
        <button
          className={getButtonStyles(roleConfig.variant)}
          onClick={() => handleAction("lock-funds", onLockFunds)}
          disabled={loading !== null}
        >
          {loading === "lock-funds" ? (
            <>
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
              <span>Procesando...</span>
            </>
          ) : (
            <>
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>{roleConfig.label}</span>
            </>
          )}
        </button>
      )}

      {hasAction && roleConfig.action === "mark-paid" && (
        <button
          className={getButtonStyles(roleConfig.variant)}
          onClick={() => handleAction("mark-paid", onMarkPaid)}
          disabled={loading !== null}
        >
          {loading === "mark-paid" ? (
            <>
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
              <span>Confirmando...</span>
            </>
          ) : (
            <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{roleConfig.label}</span>
            </>
          )}
        </button>
      )}

      {hasAction && roleConfig.action === "release" && (
        <button
          className={getButtonStyles(roleConfig.variant)}
          onClick={() => handleAction("release", onRelease)}
          disabled={loading !== null}
        >
          {loading === "release" ? (
            <>
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
              <span>Liberando...</span>
            </>
          ) : (
            <>
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <span>{roleConfig.label}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
