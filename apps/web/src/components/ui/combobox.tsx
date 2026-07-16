"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, XIcon } from "lucide-react"

export type ComboboxOption = { value: string; label: string }

// A searchable single-select dropdown — like Select, but with a text input
// that filters the option list. Built on Base UI's Combobox primitive.
function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  className,
}: {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const selected = options.find((o) => o.value === value) ?? null

  return (
    <ComboboxPrimitive.Root<ComboboxOption>
      items={options}
      value={selected}
      onValueChange={(item) => onValueChange(item?.value ?? "")}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxPrimitive.InputGroup
        className={cn(
          "relative flex h-8 w-full items-center rounded-lg border border-input bg-transparent has-focus-within:border-ring has-focus-within:ring-3 has-focus-within:ring-ring/50 dark:bg-input/30",
          className
        )}
      >
        <ComboboxPrimitive.Input
          placeholder={placeholder}
          className="h-full w-full min-w-0 rounded-lg border-0 bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground pr-14"
        />
        <div className="absolute right-1 flex items-center gap-0.5">
          <ComboboxPrimitive.Clear
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground data-[empty]:hidden"
            aria-label="Clear"
          >
            <XIcon className="size-3.5" />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger
            className="flex size-6 items-center justify-center rounded text-muted-foreground"
            aria-label="Open"
          >
            <ChevronDownIcon className="size-3.5" />
          </ComboboxPrimitive.Trigger>
        </div>
      </ComboboxPrimitive.InputGroup>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner className="outline-none" sideOffset={4}>
          <ComboboxPrimitive.Popup className="w-(--anchor-width) max-h-(--available-height) origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ComboboxPrimitive.Empty className="px-2.5 py-2 text-sm text-muted-foreground data-empty:hidden">
              No matches found.
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="scroll-my-1 p-1">
              {(item: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="flex-1">{item.label}</span>
                  <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { Combobox }
