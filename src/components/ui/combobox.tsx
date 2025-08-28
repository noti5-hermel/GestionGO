
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

export type ComboboxItem = {
  value: string
  label: string
}

interface ScrollableComboboxProps {
  items: ComboboxItem[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  noItemsText?: string
  searchText?: string
  className?: string;
}

export function ScrollableCombobox({
  items,
  value,
  onValueChange,
  placeholder = "Select an item...",
  noItemsText = "No item found.",
  searchText = "Search items...",
  className,
}: ScrollableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedItem = items && items.find((item) => item.value === value)

  const filteredItems = React.useMemo(() => {
    if (!items) return []
    if (!search) {
      return items
    }
    return items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [items, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          aria-label={placeholder}
        >
          {selectedItem ? selectedItem.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" position="popper">
        <div className="p-2">
          <Input
            placeholder={searchText}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
            aria-label={searchText}
          />
        </div>
        <ScrollArea className="h-64">
          <div className="p-1" role="listbox">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.value}
                  onClick={() => {
                    onValueChange(item.value === value ? "" : item.value)
                    setOpen(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onValueChange(item.value === value ? "" : item.value)
                      setOpen(false)
                    }
                  }}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                  role="option"
                  aria-selected={value === item.value}
                  tabIndex={0}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">{noItemsText}</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
