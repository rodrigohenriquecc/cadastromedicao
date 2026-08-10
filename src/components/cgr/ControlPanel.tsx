import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import {
  ChevronDown,
  Crosshair,
  FileSpreadsheet,
  Loader2,
  ListFilter,
  Upload,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  onLocate: () => void;
  descriptions: string[];
  selectedDescriptions: string[];
  onDescriptions: (values: string[]) => void;
  onFile: (file: File) => void;
  loading: boolean;
  status: string;
  visibleCount: number;
};

export function ControlPanel(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(!isMobile), [isMobile]);
  const options = useMemo(
    () => props.descriptions.map((d) => ({ value: d, label: d })),
    [props.descriptions],
  );
  const value = useMemo(
    () => props.selectedDescriptions.map((d) => ({ value: d, label: d })),
    [props.selectedDescriptions],
  );

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[1000] w-full rounded-t-3xl border border-white/30 bg-white/25 shadow-2xl backdrop-blur-md md:inset-x-auto md:bottom-4 md:left-4 md:w-64 md:rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[44px] w-full flex-col items-center gap-2 px-4 pb-2 pt-2 md:cursor-default md:pt-3"
      >
        <span className="h-1.5 w-10 rounded-full bg-foreground/25 md:hidden" />
        <span className="flex w-full items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
            <span className="mr-1.5 text-lg font-bold text-yellow-400">{props.visibleCount}</span>
            {props.visibleCount === 1 ? "serviço" : "serviços"}
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-foreground/60 transition-transform md:hidden ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <div className={`px-4 pb-4 ${open ? "block" : "hidden"}`}>
      <label className="mb-1 flex items-center gap-2 text-xs font-bold text-foreground">
        <ListFilter size={14} className="text-primary" />
        Filtrar por Serviço
      </label>
      <div className="mb-3">
        {!mounted ? (
          <div className="h-11 w-full rounded-lg border border-white/40 bg-white/30" />
        ) : (
        <Select
          isMulti
          isClearable
          instanceId="cgr-descricao"
          options={options}
          value={value}
          onChange={(selected) => props.onDescriptions(selected.map((item) => item.value))}
          placeholder="Todos os serviços"
          noOptionsMessage={() => "Carregue o CM.xlsx"}
          menuPlacement="top"
          maxMenuHeight={220}
          classNamePrefix="cgr-select"
          styles={{
            control: (base) => ({
              ...base,
              minHeight: 44,
              borderRadius: 8,
              fontSize: 13,
              background: "rgba(255, 255, 255, 0.3)",
              borderColor: "rgba(255, 255, 255, 0.4)",
              boxShadow: "none",
            }),
            valueContainer: (base) => ({ ...base, padding: "2px 6px" }),
            menu: (base) => ({ ...base, fontSize: 13, zIndex: 2000 }),
            multiValue: (base) => ({ ...base, borderRadius: 6 }),
            multiValueLabel: (base) => ({ ...base, fontSize: 11 }),
          }}
        />
        )}
      </div>

      <button
        onClick={props.onLocate}
        className="mb-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary/90 px-3 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary active:scale-[0.98]"
      >
        <Crosshair size={15} />
        Localizar
      </button>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) props.onFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`min-h-[44px] cursor-pointer rounded-lg border border-dashed px-3 py-2.5 text-center text-[11px] transition ${
          dragging
            ? "border-primary bg-primary/10 text-primary"
            : "border-foreground/20 bg-white/20 text-muted-foreground hover:border-primary/50"
        }`}
      >
        <span className="flex items-center justify-center gap-1.5 font-medium">
          {props.loading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {props.loading ? "Processando arquivo..." : "Solte o CM.xlsx aqui"}
        </span>
        <span className="mt-1 flex items-center justify-center gap-1 text-[10px] leading-tight">
          <FileSpreadsheet size={11} />
          {props.status}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) props.onFile(file);
          }}
        />
      </div>
      </div>
    </div>
  );
}