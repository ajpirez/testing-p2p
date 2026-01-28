"use client";

import { STEPS, type OrderStatus, getStatusConfig } from "@/types/order";

interface OrderTimelineProps {
  status: OrderStatus;
}

export function OrderTimeline({ status }: OrderTimelineProps) {
  const config = getStatusConfig(status);
  const currentStep = config.step;
  const isTerminalNegative =
    status === "CANCELLED" || status === "DISPUTED" || status === "REFUNDED";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.step;
          const isCurrent = currentStep === step.step;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.step} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all
                    ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                          ? isTerminalNegative
                            ? `${config.borderColor} ${config.bgColor} ${config.color}`
                            : `border-blue-500 bg-blue-500 text-white ring-4 ring-blue-100`
                          : "border-zinc-300 bg-white text-zinc-400"
                    }
                  `}
                >
                  {isCompleted ? (
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
                  ) : isCurrent && isTerminalNegative ? (
                    <span className="text-lg">{config.icon}</span>
                  ) : (
                    step.step
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-medium ${isCurrent ? "text-zinc-900" : "text-zinc-500"}`}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-zinc-400 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 px-2">
                  <div
                    className={`h-1 w-full rounded-full transition-all ${
                      isCompleted ? "bg-emerald-500" : "bg-zinc-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
