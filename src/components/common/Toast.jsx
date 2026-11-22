import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export function Toast({ notification, onClose }) {
  if (!notification) return null;

  const { type, message } = notification;

  const typeConfig = {
    success: {
      icon: CheckCircle2,
      border: "border-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100",
      iconColor: "text-emerald-500"
    },
    error: {
      icon: AlertCircle,
      border: "border-rose-500",
      bg: "bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100",
      iconColor: "text-rose-500"
    },
    warning: {
      icon: AlertTriangle,
      border: "border-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100",
      iconColor: "text-amber-500"
    },
    info: {
      icon: Info,
      border: "border-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-500"
    }
  };

  const current = typeConfig[type] || typeConfig.info;
  const Icon = current.icon;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md animate-fade-in shadow-xl">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${current.border} ${current.bg} backdrop-blur-md shadow-lg`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${current.iconColor}`} />
        <div className="flex-1 text-sm font-medium pr-2">{message}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
