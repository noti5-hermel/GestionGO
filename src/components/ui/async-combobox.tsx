
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormField } from "./form";
import { Input } from "./input";

type AsyncComboboxProps = {
  value?: string;
  onValueChange: (value: string) => void;
  loadOptions: (query: string) => Promise<{ label: string; value: string }[]>;
  placeholder?: string;
  className?: string;
};

// Hook para "rebotar" la entrada del usuario.
// Evita que se hagan demasiadas peticiones mientras el usuario escribe.
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancela el timeout si el valor cambia (ej. el usuario sigue escribiendo)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AsyncCombobox({
  value,
  onValueChange,
  loadOptions,
  placeholder = "Busca una opción...",
  className,
}: AsyncComboboxProps) {
  const { error, formItemId } = useFormField();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [options, setOptions] = React.useState<{ label: string; value: string }[]>([]);
  const [selectedLabel, setSelectedLabel] = React.useState<string | undefined>(undefined);

  const comboboxRef = React.useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms de retraso

  React.useEffect(() => {
    if (!open) {
      return;
    }
    
    setIsLoading(true);
    async function fetchOptions() {
      const newOptions = await loadOptions(debouncedSearchQuery);
      setOptions(newOptions);
      setIsLoading(false);
    }

    fetchOptions();
  }, [debouncedSearchQuery, loadOptions, open]);
  
  // Efecto para obtener la etiqueta del valor seleccionado si no está en las opciones actuales
  React.useEffect(() => {
    if (value && !options.some(opt => opt.value === value)) {
      async function fetchSelectedOption() {
        const loadedOptions = await loadOptions(value);
        const selected = loadedOptions.find(opt => opt.value === value);
        if (selected) {
          setSelectedLabel(selected.label);
        }
      }
      fetchSelectedOption();
    } else {
        const selected = options.find(opt => opt.value === value);
        setSelectedLabel(selected?.label);
    }
  }, [value, options, loadOptions]);


  // Manejador para cerrar el combobox al hacer clic fuera
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectOption = (selectedValue: string) => {
    onValueChange(selectedValue);
    const selected = options.find(opt => opt.value === selectedValue);
    setSearchQuery(selected?.label || "");
    setOpen(false);
  };

  return (
    <div ref={comboboxRef} className={cn("w-full relative", className)}>
      <button
        type="button"
        id={formItemId}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-4 py-2 text-sm",
          "font-normal shadow-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          open && "ring-2 ring-ring ring-offset-2",
          error && "border-destructive"
        )}
        role="combobox"
        aria-expanded={open}
      >
        <span className="truncate">
          {selectedLabel || value || placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg">
          <div className="p-2">
            <Input
              placeholder="Escribe para buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Cargando...</span>
              </div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelectOption(option.value)}
                  className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent"
                  role="option"
                  aria-selected={value === option.value}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No se encontraron resultados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
    