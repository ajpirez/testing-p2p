"use client";

import { type UserRole } from "@/types/order";

interface RoleIndicatorProps {
  role: UserRole;
  showLabel?: boolean;
}

const ROLE_CONFIG = {
  seller: {
    label: "Eres el Vendedor",
    shortLabel: "Seller",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "💰",
  },
  buyer: {
    label: "Eres el Comprador",
    shortLabel: "Buyer",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: "🛒",
  },
  spectator: {
    label: "Espectador",
    shortLabel: "Viewer",
    color: "text-zinc-600",
    bgColor: "bg-zinc-50",
    borderColor: "border-zinc-200",
    icon: "👁️",
  },
};

export function RoleIndicator({ role, showLabel = true }: RoleIndicatorProps) {
  const config = ROLE_CONFIG[role];

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-lg border px-3 py-2
        ${config.bgColor} ${config.borderColor}
      `}
    >
      <span className="text-lg">{config.icon}</span>
      {showLabel && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
