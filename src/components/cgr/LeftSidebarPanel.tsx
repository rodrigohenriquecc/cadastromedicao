import { useMemo, useState, useRef } from "react";
import Select from "react-select";
import {
  Route,
  Search,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
  FileSpreadsheet,
  RotateCcw,
  Ruler,
  ListFilter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Calculator,
} from "lucide-react";
import type { HighwaySummary } from "@/lib/cgr-data";
import type { ServicePoint } from "@/lib/cgr-types";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  // Highways
  highways: HighwaySummary[];
  selectedHighways: string[];
  onSelectHighway: (sp: string) => void;
  onSetHighways?: (sps: string[]) => void;
  onClearHighways: () => void;
  onLocateHighway: (sp: string) => void;

  // RC Filter
  rcs?: string[];
  selectedRcs?: string[];
  onRcs?: (values: string[]) => void;

  // Descriptions
  descriptions: string[];
  selectedDescriptions: string[];
  onDescriptions: (values: string[]) => void;

  // File Upload & Locate
  onFile: (file: File) => void;
  loading: boolean;
  status: string;
  onLocate: () => void;
  visibleCount: number;
  totalCount: number;

  // Filtered Services List for Summary
  visibleServices?: ServicePoint[];

  // Global Reset
  onResetAll: () => void;
};

function parseBrFloat(val: any): number | null {
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;

  let cleaned = str.replace(/[^\d.,+-]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatBrTwoDecimals(val: any): string {
  if (val === null || val === undefined || val === "") return "-";
  const str = String(val).trim();
  if (!str || str === "-") return "-";

  const n = parseBrFloat(str);
  if (n === null) return str.replace(".", ",");
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function LeftSidebarPanel({
  highways,
  selectedHighways,
  onSelectHighway,
  onSetHighways,
  onClearHighways,
  onLocateHighway,
  rcs = [],
  selectedRcs = [],
  onRcs = () => undefined,
  descriptions,
  selectedDescriptions,
  onDescriptions,
  onFile,
  loading,
  status,
  onLocate,
  visibleCount,
  totalCount,
  visibleServices = [],
  onResetAll,
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [highwaySearch, setHighwaySearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Accordion section collapse state
  const [sections, setSections] = useState({
    upload: true,
    rcs: true,
    highways: true,
    descriptions: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedHwSet = useMemo(() => new Set(selectedHighways), [selectedHighways]);

  const activeHighways = useMemo(() => {
    return highways.filter((h) => h.totalServices > 0);
  }, [highways]);

  const highwayOptions = useMemo(
    () =>
      activeHighways.map((h) => ({
        value: h.sp,
        label: `${h.sp} — ${h.totalServices} serv.`,
      })),
    [activeHighways],
  );

  const highwayValue = useMemo(
    () =>
      selectedHighways.map((sp) => {
        const found = activeHighways.find((h) => h.sp === sp);
        return {
          value: sp,
          label: found ? `${found.sp} — ${found.totalServices} serv.` : sp,
        };
      }),
    [selectedHighways, activeHighways],
  );

  const filteredHighways = useMemo(() => {
    if (!highwaySearch.trim()) return activeHighways;
    const q = highwaySearch.trim().toLowerCase();
    return activeHighways.filter((h) => h.sp.toLowerCase().includes(q));
  }, [activeHighways, highwaySearch]);

  const rcOptions = useMemo(
    () => (rcs ?? []).map((r) => ({ value: r, label: `RC: ${r}` })),
    [rcs],
  );

  const rcValue = useMemo(
    () => (selectedRcs ?? []).map((r) => ({ value: r, label: `RC: ${r}` })),
    [selectedRcs],
  );

  const descriptionOptions = useMemo(
    () => descriptions.map((d) => ({ value: d, label: d })),
    [descriptions],
  );

  const descriptionValue = useMemo(
    () => selectedDescriptions.map((d) => ({ value: d, label: d })),
    [selectedDescriptions],
  );

  const hasAnyFilter =
    selectedHighways.length > 0 ||
    selectedRcs.length > 0 ||
    selectedDescriptions.length > 0 ||
    highwaySearch.trim() !== "";

  const filteredVisibleServices = useMemo(() => {
    let list = visibleServices;
    if (highwaySearch.trim()) {
      const q = highwaySearch.trim().toLowerCase();
      list = list.filter((pt) => pt.sp.toLowerCase().includes(q));
    }
    return list;
  }, [visibleServices, highwaySearch]);

  const totalQuantidade = useMemo(() => {
    let sum = 0;
    let hasNumeric = false;
    for (const pt of filteredVisibleServices) {
      if (!pt.quantidade) continue;
      const n = parseBrFloat(pt.quantidade);
      if (n !== null) {
        sum += n;
        hasNumeric = true;
      }
    }
    return hasNumeric ? sum : null;
  }, [filteredVisibleServices]);

  return (
    <>
      {/* Mobile Backdrop Overlay (Allows easy tap outside on phones) */}
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="pointer-events-auto fixed left-0 top-0 bottom-0 z-[1000] select-none font-sans">
        {/* Main Left Sidebar Panel (DER Charcoal Dark Theme) */}
        <div
          className={`relative flex h-full w-[88vw] max-w-[340px] sm:w-[380px] flex-col border-r border-[#212529] bg-[#343a40] text-slate-100 shadow-2xl transition-transform duration-300 ease-in-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Top Header Banner (Authentic DER Blue Navbar) */}
          <div className="flex shrink-0 items-center justify-between bg-[#207ba1] px-3.5 py-3 text-white shadow-md border-b border-[#185e7b] min-h-[52px]">
            <div className="flex items-center gap-2.5">
              {/* DER Yellow Sun Logo Badge */}
              <div className="flex h-8 w-11 shrink-0 items-center justify-center rounded bg-[#ffd600] px-1 font-black italic text-[#1b5e91] text-xs shadow border border-yellow-300">
                DER
              </div>
              <div className="leading-tight">
                <h1 className="text-xs font-black tracking-wide uppercase text-white">
                  Sistema de Administração
                </h1>
                <p className="text-[10px] font-semibold text-sky-100">
                  Conservação • CGR 02
                </p>
              </div>
            </div>

            {hasAnyFilter && (
              <button
                type="button"
                onClick={onResetAll}
                className="flex items-center gap-1.5 rounded-lg border border-[#ffc107] bg-[#ffc107]/10 px-3 py-2 text-xs font-bold text-[#ffc107] hover:bg-[#ffc107] hover:text-slate-950 transition shadow-sm min-h-[44px] cursor-pointer"
                title="Limpar todos os filtros"
              >
                <RotateCcw size={14} />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* DER Inset Search Box ("Procurar") - Touch Friendly & Anti-Zoom */}
          <div className="shrink-0 bg-[#2b3035] p-2.5 border-b border-[#212529]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={highwaySearch}
                onChange={(e) => setHighwaySearch(e.target.value)}
                placeholder="Procurar..."
                className="w-full min-h-[44px] rounded-lg bg-[#23272b] border border-[#495057] py-2 pl-3.5 pr-10 text-base md:text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#207ba1] transition"
              />
              <Search size={16} className="absolute right-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Global High-Visibility DER Management KPI Card for TOTAL QNTD */}
          <div className="shrink-0 bg-[#272b30] p-3 border-b border-[#212529]">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1.5">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wide">
                <Calculator size={14} className="text-amber-400" />
                Total QNTD Filtrada:
              </span>
              <span className="rounded-md bg-[#207ba1] px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                {visibleCount} de {totalCount} serv.
              </span>
            </div>
            <div className="flex items-baseline justify-between rounded-lg bg-[#1c2024] border-l-4 border-l-[#ffc107] border border-[#40464d] px-3 py-2 text-[#ffc107] shadow-inner">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">QNTD ACUMULADA</span>
              <span className="font-mono text-lg font-black text-[#ffc107] tracking-tight">
                {totalQuantidade !== null
                  ? totalQuantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "0,00"}
              </span>
            </div>
          </div>

          {/* Scrollable Section Accordion List (DER Navigation Theme) */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#212529] bg-[#2f353a]">
            {/* GROUP HEADER: PLANO DE CONSERVAÇÃO */}
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-3 pb-1">
              Plano de Conservação
            </div>

            {/* SECTION 1: Importação CM.xlsx */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("upload")}
                className="flex w-full items-center justify-between bg-[#24282c] px-4 py-3 min-h-[48px] text-left text-xs font-bold text-slate-200 hover:bg-[#207ba1] hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-amber-400" />
                  1. Importação (CM.xlsx)
                </span>
                {sections.upload ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {sections.upload && (
                <div className="p-3 bg-white text-slate-900 border-t border-slate-300">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) onFile(file);
                    }}
                    onClick={() => inputRef.current?.click()}
                    className={`cursor-pointer rounded-lg border-2 border-dashed min-h-[56px] p-3.5 text-center transition flex flex-col items-center justify-center ${
                      dragging
                        ? "border-[#207ba1] bg-sky-50 text-[#207ba1] font-bold"
                        : "border-slate-300 bg-slate-50 text-slate-700 hover:border-[#207ba1] hover:bg-sky-50/50 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 font-bold text-xs text-slate-900">
                      {loading ? (
                        <Loader2 size={18} className="animate-spin text-[#207ba1]" />
                      ) : (
                        <Upload size={18} className="text-[#207ba1]" />
                      )}
                      <span>{loading ? "Processando arquivo..." : "Solte o CM.xlsx aqui ou clique"}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-slate-600">{status}</p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onFile(file);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Registro RC (Primary Filter) */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("rcs")}
                className="flex w-full items-center justify-between bg-[#24282c] px-4 py-3 min-h-[48px] text-left text-xs font-bold text-slate-200 hover:bg-[#207ba1] hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ListFilter size={16} className="text-teal-400" />
                  2. Registro RC ({rcs.length})
                </span>
                <div className="flex items-center gap-2">
                  {selectedRcs.length > 0 && (
                    <span className="rounded bg-teal-600 px-2 py-1 text-[10px] font-bold text-white">
                      {selectedRcs.length} sel.
                    </span>
                  )}
                  {sections.rcs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {sections.rcs && (
                <div className="p-3 bg-white text-slate-900 border-t border-slate-300">
                  <Select
                    isMulti
                    isClearable
                    instanceId="sidebar-cgr-rc"
                    options={rcOptions}
                    value={rcValue}
                    onChange={(selected) => onRcs(selected ? selected.map((item) => item.value) : [])}
                    placeholder="Selecione os registros RC..."
                    noOptionsMessage={() => "Nenhum RC disponível no arquivo"}
                    menuPlacement="auto"
                    maxMenuHeight={220}
                    classNamePrefix="sidebar-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: 44,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        background: "#ffffff",
                        borderColor: "#cbd5e1",
                        borderWidth: 1.5,
                        boxShadow: "none",
                        "&:hover": { borderColor: "#207ba1" },
                      }),
                      menu: (base) => ({ ...base, fontSize: 13, zIndex: 2000, background: "#ffffff" }),
                      option: (base, state) => ({
                        ...base,
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        padding: "10px 14px",
                        fontSize: 13,
                        cursor: "pointer",
                        backgroundColor: state.isSelected
                          ? "#0d9488"
                          : state.isFocused
                          ? "#f0fdf4"
                          : "#ffffff",
                        color: state.isSelected ? "#ffffff" : "#0f172a",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#ccfbf1",
                        borderRadius: 6,
                        border: "1px solid #2dd4bf",
                        padding: "2px 4px",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "#115e59",
                        fontWeight: 700,
                        fontSize: 11,
                      }),
                    }}
                  />
                </div>
              )}
            </div>

            {/* GROUP HEADER: EXECUÇÃO & SERVIÇOS */}
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-3 pb-1">
              Execução & Serviços
            </div>

            {/* SECTION 3: Rodovias (Secondary Filter) */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("highways")}
                className="flex w-full items-center justify-between bg-[#24282c] px-4 py-3 min-h-[48px] text-left text-xs font-bold text-slate-200 hover:bg-[#207ba1] hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Route size={16} className="text-[#ffc107]" />
                  3. Rodovias ({activeHighways.length})
                </span>
                <div className="flex items-center gap-2">
                  {selectedHighways.length > 0 && (
                    <span className="rounded bg-[#207ba1] px-2 py-1 text-[10px] font-bold text-white">
                      {selectedHighways.length} sel.
                    </span>
                  )}
                  {sections.highways ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {sections.highways && (
                <div className="p-3 space-y-3 bg-white text-slate-900 border-t border-slate-300">
                  <Select
                    isMulti
                    isClearable
                    instanceId="sidebar-cgr-rodovia"
                    options={highwayOptions}
                    value={highwayValue}
                    onChange={(selected) => {
                      const values = selected ? selected.map((item) => item.value) : [];
                      if (onSetHighways) {
                        onSetHighways(values);
                      } else {
                        onClearHighways();
                        values.forEach((v) => onSelectHighway(v));
                      }
                    }}
                    placeholder="Selecione as rodovias..."
                    noOptionsMessage={() => "Carregue o CM.xlsx para ver rodovias"}
                    menuPlacement="auto"
                    maxMenuHeight={220}
                    classNamePrefix="sidebar-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: 44,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        background: "#ffffff",
                        borderColor: "#cbd5e1",
                        borderWidth: 1.5,
                        boxShadow: "none",
                        "&:hover": { borderColor: "#207ba1" },
                      }),
                      menu: (base) => ({ ...base, fontSize: 13, zIndex: 2000, background: "#ffffff" }),
                      option: (base, state) => ({
                        ...base,
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        padding: "10px 14px",
                        fontSize: 13,
                        cursor: "pointer",
                        backgroundColor: state.isSelected
                          ? "#207ba1"
                          : state.isFocused
                          ? "#f0f9ff"
                          : "#ffffff",
                        color: state.isSelected ? "#ffffff" : "#0f172a",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#e0f2fe",
                        borderRadius: 6,
                        border: "1px solid #38bdf8",
                        padding: "2px 4px",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "#0369a1",
                        fontWeight: 700,
                        fontSize: 11,
                      }),
                    }}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allSps = activeHighways.map((h) => h.sp);
                        if (onSetHighways) onSetHighways(allSps);
                      }}
                      className="flex-1 rounded-lg bg-[#207ba1] min-h-[44px] py-2.5 px-3 text-xs font-bold text-white hover:bg-[#1a6291] transition shadow-sm cursor-pointer text-center flex items-center justify-center"
                    >
                      Selecionar Todas
                    </button>
                    {selectedHighways.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearHighways}
                        className="rounded-lg border border-[#dc3545] bg-[#dc3545]/10 min-h-[44px] px-3.5 py-2.5 text-xs font-bold text-[#dc3545] hover:bg-[#dc3545] hover:text-white transition shadow-sm cursor-pointer flex items-center justify-center"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Selected Highways Quick Zoom Cards */}
                  {selectedHighways.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-300 pt-1">
                      {selectedHighways.map((sp) => {
                        const h = activeHighways.find((item) => item.sp === sp);
                        return (
                          <div
                            key={sp}
                            className="flex items-center justify-between rounded-lg p-2.5 bg-slate-50 border border-slate-300 shadow-sm text-xs font-semibold text-slate-900"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-6 items-center justify-center rounded bg-[#207ba1] px-2 font-mono text-xs font-bold text-white uppercase">
                                {sp}
                              </span>
                              <span className="text-xs text-slate-600 truncate">
                                {h ? `${h.totalServices} serv.` : ""}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onLocateHighway(sp)}
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-sky-100 text-[#207ba1] hover:bg-[#207ba1] hover:text-white transition border border-sky-300 cursor-pointer shrink-0"
                              title={`Zoom em ${sp}`}
                            >
                              <Crosshair size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 4: Descrição do Serviço & Resumo */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("descriptions")}
                className="flex w-full items-center justify-between bg-[#24282c] px-4 py-3 min-h-[48px] text-left text-xs font-bold text-slate-200 hover:bg-[#207ba1] hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ListFilter size={16} className="text-sky-300" />
                  4. Descrição do Serviço
                </span>
                <div className="flex items-center gap-2">
                  {selectedDescriptions.length > 0 && (
                    <span className="rounded bg-[#207ba1] px-2 py-1 text-[10px] font-bold text-white">
                      {selectedDescriptions.length} sel.
                    </span>
                  )}
                  {sections.descriptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {sections.descriptions && (
                <div className="p-3 bg-white text-slate-900 border-t border-slate-300">
                  <Select
                    isMulti
                    isClearable
                    instanceId="sidebar-cgr-descricao"
                    options={descriptionOptions}
                    value={descriptionValue}
                    onChange={(selected) => onDescriptions(selected ? selected.map((item) => item.value) : [])}
                    placeholder="Selecione os serviços desejados..."
                    noOptionsMessage={() => "Carregue o CM.xlsx para ver serviços"}
                    menuPlacement="auto"
                    maxMenuHeight={220}
                    classNamePrefix="sidebar-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: 44,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        background: "#ffffff",
                        borderColor: "#cbd5e1",
                        borderWidth: 1.5,
                        boxShadow: "none",
                        "&:hover": { borderColor: "#207ba1" },
                      }),
                      menu: (base) => ({ ...base, fontSize: 13, zIndex: 2000, background: "#ffffff" }),
                      option: (base, state) => ({
                        ...base,
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        padding: "10px 14px",
                        fontSize: 13,
                        cursor: "pointer",
                        backgroundColor: state.isSelected
                          ? "#3730a3"
                          : state.isFocused
                          ? "#eef2ff"
                          : "#ffffff",
                        color: state.isSelected ? "#ffffff" : "#0f172a",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#e0e7ff",
                        borderRadius: 6,
                        border: "1px solid #818cf8",
                        padding: "2px 4px",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "#3730a3",
                        fontWeight: 700,
                        fontSize: 11,
                      }),
                    }}
                  />

                  {/* DER Resumo do Serviço Filtrado Card */}
                  <div className="mt-3 rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm">
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Resumo do Serviço Filtrado
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-[#207ba1] px-2 py-0.5 text-[10px] font-bold text-white">
                          {filteredVisibleServices.length} {filteredVisibleServices.length === 1 ? "item" : "itens"}
                        </span>
                        {totalQuantidade !== null && (
                          <span className="rounded bg-[#ffc107] px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-sm" title="Soma total das quantidades dos serviços filtrados">
                            Total: {totalQuantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Filter Tags */}
                    {(selectedHighways.length > 0 || highwaySearch.trim() || selectedRcs.length > 0 || selectedDescriptions.length > 0) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {selectedHighways.map((hw) => (
                          <span key={hw} className="inline-flex items-center gap-1 rounded bg-sky-100 border border-sky-300 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                            {hw}
                          </span>
                        ))}
                        {highwaySearch.trim() && (
                          <span key="search" className="inline-flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            Busca: "{highwaySearch}"
                          </span>
                        )}
                        {selectedRcs.length > 0 && (
                          <span key="rcs" className="inline-flex items-center gap-1 rounded bg-teal-100 border border-teal-300 px-1.5 py-0.5 text-[10px] font-bold text-teal-900">
                            {selectedRcs.length} RC(s)
                          </span>
                        )}
                        {selectedDescriptions.length > 0 && (
                          <span key="desc" className="inline-flex items-center gap-1 rounded bg-indigo-100 border border-indigo-300 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
                            {selectedDescriptions.length} serviço(s)
                          </span>
                        )}
                      </div>
                    )}

                    {filteredVisibleServices.length === 0 ? (
                      <div className="py-3 text-center text-xs font-semibold text-slate-500 bg-slate-50 rounded border border-slate-200">
                        Nenhum serviço filtrado para as seleções atuais.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-x-auto overflow-y-auto rounded border border-slate-300 scrollbar-thin scrollbar-thumb-slate-400 touch-pan-x">
                        <table className="w-full min-w-[440px] border-collapse text-left text-xs font-semibold">
                          <thead className="sticky top-0 bg-[#207ba1] text-white font-bold uppercase tracking-wider text-[10px] shadow-sm z-10">
                            <tr>
                              <th className="px-2 py-1.5 border-b border-[#185e7b]">KM INICIAL</th>
                              <th className="px-2 py-1.5 border-b border-[#185e7b]">SP</th>
                              <th className="px-2 py-1.5 border-b border-[#185e7b]">RC</th>
                              <th className="px-2 py-1.5 border-b border-[#185e7b]">SENTIDO</th>
                              <th className="px-2 py-1.5 border-b border-[#185e7b]">COMPR.</th>
                              <th className="px-2 py-1.5 border-b border-[#185e7b]">LARG.</th>
                              <th className="px-2 py-1.5 border-b border-[#185e7b]">ALT./ESP.</th>
                              <th className="px-2 py-1.5 border-b border-[#185e7b] text-right">QNTD</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white text-slate-900">
                            {filteredVisibleServices.map((pt, idx) => (
                              <tr key={pt.id || idx} className="hover:bg-sky-50/70 transition">
                                <td className="px-2 py-1.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {pt.kmInicial.toFixed(3).replace(".", ",")}
                                </td>
                                <td className="px-2 py-1.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                                  {pt.sp}
                                </td>
                                <td className="px-2 py-1.5 font-mono font-bold text-teal-900 whitespace-nowrap">
                                  {pt.rc || "-"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-700 whitespace-nowrap">
                                  {pt.sentido || "-"}
                                </td>
                                <td className="px-2 py-1.5 font-mono text-[#207ba1] whitespace-nowrap">
                                  {formatBrTwoDecimals(pt.comprimento)}
                                </td>
                                <td className="px-2 py-1.5 font-mono text-slate-700 whitespace-nowrap">
                                  {formatBrTwoDecimals(pt.largura)}
                                </td>
                                <td className="px-2 py-1.5 font-mono text-slate-700 whitespace-nowrap">
                                  {formatBrTwoDecimals(pt.altEsp)}
                                </td>
                                <td className="px-2 py-1.5 font-mono font-extrabold text-[#207ba1] text-right whitespace-nowrap">
                                  {formatBrTwoDecimals(pt.quantidade)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {totalQuantidade !== null && (
                            <tfoot className="sticky bottom-0 bg-[#175773] text-white font-bold uppercase text-[10px] shadow-lg z-10">
                              <tr>
                                <td colSpan={7} className="px-2 py-2 text-right font-bold border-t border-[#103d52] tracking-wider text-slate-200">
                                  TOTAL QNTD:
                                </td>
                                <td className="px-2 py-2 text-right font-mono font-black text-[#ffc107] text-xs border-t border-[#103d52] whitespace-nowrap">
                                  {totalQuantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer info bar (Authentic DER Footer Style) */}
          <div className="shrink-0 bg-[#212529] px-3.5 py-2.5 text-center text-[10px] font-semibold text-slate-400 border-t border-[#181b1e]">
            Copyright © 2026 <span className="font-bold text-white">DER-SP</span>. Todos os direitos reservados. • <span className="text-slate-400">Version 2.35.0</span>
          </div>

          {/* Sidebar Toggle Handle Button (Attached to sidebar right edge, minimum 44px touch width) */}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="absolute left-full top-1/2 -translate-y-1/2 flex min-h-[52px] min-w-[44px] h-16 w-11 items-center justify-center rounded-r-xl border-2 border-l-0 border-[#212529] bg-[#207ba1] text-white shadow-2xl hover:bg-[#1a6291] active:scale-95 transition cursor-pointer z-50"
            title={open ? "Recolher painel lateral" : "Expandir painel de controle"}
            aria-label={open ? "Recolher painel lateral" : "Expandir painel de controle"}
          >
            {open ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
          </button>
        </div>
      </div>
    </>
  );
}
