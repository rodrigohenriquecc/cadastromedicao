import { useMemo, useState } from "react";
import {
  Route,
  Search,
  Crosshair,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Ruler,
  Layers,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import type { HighwaySummary } from "@/lib/cgr-data";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  highways: HighwaySummary[];
  selectedHighways: string[];
  onSelectHighway: (sp: string) => void;
  onClearHighways: () => void;
  onLocateHighway: (sp: string) => void;
};

export function HighwayPanel({
  highways,
  selectedHighways,
  onSelectHighway,
  onClearHighways,
  onLocateHighway,
}: Props) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(!isMobile);
  const [search, setSearch] = useState("");

  const filteredHighways = useMemo(() => {
    if (!search.trim()) return highways;
    const term = search.trim().toLowerCase();
    return highways.filter((h) => h.sp.toLowerCase().includes(term));
  }, [highways, search]);

  const selectedSet = useMemo(() => new Set(selectedHighways), [selectedHighways]);
  const hasFilter = selectedHighways.length > 0;

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-[1000] w-[calc(100vw-24px)] max-w-sm font-sans transition-all duration-300 md:left-4 md:top-4 md:max-w-md lg:max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/85 shadow-2xl backdrop-blur-xl transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Route size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-bold text-slate-100 tracking-wide">
                  Painel Digital de Rodovias
                </h2>
                <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/30">
                  {highways.length}
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-400">
                Organização e métricas por trecho da malha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasFilter && (
              <button
                type="button"
                onClick={onClearHighways}
                className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/30 transition border border-amber-500/30"
                title="Limpar seleção de rodovias"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Ver todas</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              aria-label={expanded ? "Recolher painel" : "Expandir painel"}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Quick Filter Pills (Shown when collapsed) */}
        {!expanded && (
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none">
            <button
              type="button"
              onClick={onClearHighways}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                !hasFilter
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Todas ({highways.reduce((acc, h) => acc + h.totalServices, 0)})
            </button>
            {highways.map((h) => {
              const isSelected = selectedSet.has(h.sp);
              return (
                <button
                  key={h.sp}
                  type="button"
                  onClick={() => onSelectHighway(h.sp)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30"
                      : "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-500"
                  }`}
                >
                  <span>{h.sp}</span>
                  {h.totalServices > 0 && (
                    <span className="rounded-full bg-slate-900/60 px-1.5 py-0.2 text-[10px] text-blue-300 font-bold">
                      {h.totalServices}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded Content Grid */}
        {expanded && (
          <div className="p-3 sm:p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar rodovia (ex: SP 270)..."
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-slate-950/60 py-2.5 pl-10 pr-10 text-base md:text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] items-center justify-center text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Header Banner */}
            <div className="flex items-center justify-between rounded-xl bg-slate-950/50 p-2.5 text-xs text-slate-300 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Sparkles size={13} className="text-amber-400" />
                <span>Legenda de Status:</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Atual
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Vencido
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-600" />
                  Sem data
                </span>
              </div>
            </div>

            {/* Highway Cards Grid */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {filteredHighways.map((h) => {
                const isSelected = selectedSet.has(h.sp);
                const totalServ = h.totalServices;
                const atualPct = totalServ > 0 ? (h.statusCounts.atual / totalServ) * 100 : 0;
                const vencidoPct = totalServ > 0 ? (h.statusCounts.vencido / totalServ) * 100 : 0;
                const semPct = totalServ > 0 ? (h.statusCounts.sem / totalServ) * 100 : 0;

                return (
                  <div
                    key={h.sp}
                    onClick={() => onSelectHighway(h.sp)}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-blue-500 bg-gradient-to-br from-blue-950/70 to-slate-900 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    {/* Top Row: Shield & Focus Button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Highway Shield Badge */}
                        <div
                          className={`flex items-center justify-center rounded-lg px-2.5 py-1 font-mono text-xs font-black tracking-wider uppercase shadow-md transition ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-blue-500/30"
                              : "bg-slate-800 text-slate-100 group-hover:bg-slate-700"
                          }`}
                        >
                          {h.sp}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                          <Layers size={12} className="text-blue-400" />
                          {totalServ} {totalServ === 1 ? "serviço" : "serviços"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLocateHighway(h.sp);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 hover:bg-blue-600 hover:text-white transition shadow-sm"
                        title={`Centralizar mapa em ${h.sp}`}
                      >
                        <Crosshair size={14} />
                      </button>
                    </div>

                    {/* Extension KM details */}
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Ruler size={11} className="text-slate-500" />
                        {h.minKm !== null && h.maxKm !== null
                          ? `Km ${h.minKm.toFixed(1)} → ${h.maxKm.toFixed(1)}`
                          : "Referenciada"}
                      </span>
                      {totalServ > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {h.statusCounts.atual} atual / {h.statusCounts.vencido} venc.
                        </span>
                      )}
                    </div>

                    {/* Visual Status Meter Bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800 flex">
                      {totalServ > 0 ? (
                        <>
                          <div
                            style={{ width: `${atualPct}%` }}
                            className="bg-blue-500 h-full transition-all"
                            title={`Atual: ${h.statusCounts.atual}`}
                          />
                          <div
                            style={{ width: `${vencidoPct}%` }}
                            className="bg-red-500 h-full transition-all"
                            title={`Vencido: ${h.statusCounts.vencido}`}
                          />
                          <div
                            style={{ width: `${semPct}%` }}
                            className="bg-slate-600 h-full transition-all"
                            title={`Sem data: ${h.statusCounts.sem}`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-slate-800 h-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredHighways.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhuma rodovia encontrada para &quot;{search}&quot;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
