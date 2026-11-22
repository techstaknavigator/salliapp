import React from "react";

export function StatCard({
  title,
  amount,
  subtitle,
  icon: Icon,
  color = "emerald",
  badgeText,
  badgeColor = "emerald"
}) {
  const colorStyles = {
    emerald: {
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/60",
      accent: "hover:border-emerald-300 dark:hover:border-emerald-700/60"
    },
    blue: {
      iconBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200/70 dark:border-blue-800/60",
      accent: "hover:border-blue-300 dark:hover:border-blue-700/60"
    },
    indigo: {
      iconBg: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200/70 dark:border-indigo-800/60",
      accent: "hover:border-indigo-300 dark:hover:border-indigo-700/60"
    },
    rose: {
      iconBg: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/70 dark:border-rose-800/60",
      accent: "hover:border-rose-300 dark:hover:border-rose-700/60"
    },
    amber: {
      iconBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/60",
      accent: "hover:border-amber-300 dark:hover:border-amber-700/60"
    },
    purple: {
      iconBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200/70 dark:border-purple-800/60",
      accent: "hover:border-purple-300 dark:hover:border-purple-700/60"
    },
    cyan: {
      iconBg: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200/70 dark:border-cyan-800/60",
      accent: "hover:border-cyan-300 dark:hover:border-cyan-700/60"
    },
    teal: {
      iconBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200/70 dark:border-teal-800/60",
      accent: "hover:border-teal-300 dark:hover:border-teal-700/60"
    },
    slate: {
      iconBg: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      accent: "hover:border-slate-300 dark:hover:border-slate-700"
    }
  };

  const badgeStyles = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70",
    blue: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70",
    rose: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/70",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/70",
    teal: "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/70",
    slate: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
  };

  const style = colorStyles[color] || colorStyles.emerald;
  const badgeStyle = badgeStyles[badgeColor] || badgeStyles.emerald;

  return (
    <div className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[142px] sm:min-h-[150px] ${style.accent}`}>
      {/* Top Header: Title & Icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider line-clamp-1">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105 ${style.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-2">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums truncate leading-none">
          {amount}
        </h3>
      </div>

      {/* Bottom Metadata: Subtitle and Badge */}
      {(subtitle || badgeText) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate flex-1" title={subtitle}>
            {subtitle || ""}
          </span>
          {badgeText && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border whitespace-nowrap flex-shrink-0 ${badgeStyle}`}>
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
