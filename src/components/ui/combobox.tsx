"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormField } from "./form";

type ComboboxProps = {
  options: { label: string; value: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  maxHeight?: string;
};

export function Combobox({
  options: items,
  value,
  onChange: onValueChange,
  placeholder = "Selecciona una opción...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron opciones.",
  className,
  maxHeight = "240px",
}: ComboboxProps) {
  const { error, formItemId } = useFormField();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const comboboxRef = React.useRef<HTMLDivElement>(null);

  // Filtrado de ítems basado en la búsqueda
  const filteredItems = React.useMemo(() => {
    if (!search) {
      return items;
    }
    return items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  // Efecto para enfocar el input de búsqueda al abrir el menú
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Efecto para limpiar la búsqueda al cerrar el menú
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Manejador para cerrar el combobox al hacer clic fuera de él
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

  // Manejador para la selección de un item
  const handleItemSelect = (itemValue: string) => {
    onValueChange(itemValue === value ? "" : itemValue);
    setOpen(false);
  };

  const selectedItem = items.find((item) => item.value === value);

  return (
    <div 
      ref={comboboxRef} 
      className={cn("w-full relative", className)}
    >
      {/* PopoverTrigger (Button) */}
      <button
        type="button"
        id={formItemId}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-4 py-2 text-sm",
          "font-normal shadow-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          open ? "ring-2 ring-ring ring-offset-2" : "",
          error && "border-destructive"
        )}
        role="combobox"
        aria-expanded={open}
        aria-label={placeholder}
      >
        <span className="truncate">
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* PopoverContent (List) */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover text-popover-foreground shadow-lg"
        >
          {/* Search Input */}
          <div className="sticky top-0 z-10 bg-background border-b p-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors"
                aria-label={searchPlaceholder}
              />
            </div>
          </div>

          {/* Scrollable List Container */}
          <div
            className="overflow-y-auto overflow-x-hidden p-1"
            style={{ 
              maxHeight,
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--border)) transparent',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.value}
                  onClick={() => handleItemSelect(item.value)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    "active:bg-accent/80",
                    value === item.value && "bg-accent text-accent-foreground"
                  )}
                  role="option"
                  aria-selected={value === item.value}
                  tabIndex={0}
                  data-value={item.value}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            )}
          </div>

          {/* Scroll indicator */}
          {filteredItems.length > 8 && (
            <div className="sticky bottom-0 bg-gradient-to-t from-background to-transparent h-2 pointer-events-none" />
          )}
        </div>
      )}
    </div>
  );
}