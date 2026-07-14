"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  PriceListItemCreateSchema,
  type CostCode,
  type PriceListItem,
  type PriceListItemCreate,
} from "@pm4mep/shared-schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createPriceListItem, updatePriceListItem } from "./actions";

function PriceListItemForm({
  costCodes,
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  costCodes: CostCode[];
  defaultValues?: PriceListItemCreate;
  onSubmit: (values: PriceListItemCreate) => Promise<{ ok: boolean; error?: string }>;
  onSuccess: () => void;
  submitLabel: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PriceListItemCreate>({
    resolver: zodResolver(PriceListItemCreateSchema),
    defaultValues: defaultValues ?? {
      costCodeId: costCodes[0]?.id ?? "",
      description: "",
      unit: "",
      unitCost: 0,
    },
  });

  async function submit(values: PriceListItemCreate) {
    setServerError(null);
    const result = await onSubmit(values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Cost code</Label>
        <Select
          value={watch("costCodeId")}
          onValueChange={(value) => value && setValue("costCodeId", value)}
        >
          <SelectTrigger>
            {/* Base UI's SelectValue shows the raw value (here, a UUID)
                unless given a children render-fn — unlike Radix, it
                doesn't auto-derive a label from the matching SelectItem. */}
            <SelectValue placeholder="Select a cost code">
              {(value: string) => {
                const cc = costCodes.find((c) => c.id === value);
                return cc ? `${cc.code} — ${cc.description}` : "Select a cost code";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {costCodes.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.code} — {cc.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input id="manufacturer" {...register("manufacturer")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="modelNumber">Model #</Label>
          <Input id="modelNumber" {...register("modelNumber")} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" {...register("sku")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" placeholder="EA, LF…" {...register("unit")} />
          {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unitCost">Unit cost ($)</Label>
          <Input id="unitCost" type="number" step="0.0001" {...register("unitCost", { valueAsNumber: true })} />
          {errors.unitCost && <p className="text-sm text-destructive">{errors.unitCost.message}</p>}
        </div>
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddPriceListItemDialog({ costCodes }: { costCodes: CostCode[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add item</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add price list item</DialogTitle>
        </DialogHeader>
        <PriceListItemForm
          costCodes={costCodes}
          submitLabel="Add item"
          onSubmit={async (values) => createPriceListItem(values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditPriceListItemDialog({ item, costCodes }: { item: PriceListItem; costCodes: CostCode[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit price list item</DialogTitle>
        </DialogHeader>
        <PriceListItemForm
          costCodes={costCodes}
          defaultValues={{
            costCodeId: item.costCodeId,
            description: item.description,
            manufacturer: item.manufacturer ?? undefined,
            modelNumber: item.modelNumber ?? undefined,
            sku: item.sku ?? undefined,
            unit: item.unit,
            unitCost: item.unitCost,
          }}
          submitLabel="Save changes"
          onSubmit={async (values) => updatePriceListItem(item.id, values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ActiveToggle({ item }: { item: PriceListItem }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await updatePriceListItem(item.id, { active: !item.active });
    setPending(false);
    router.refresh();
  }

  return <Switch checked={item.active} disabled={pending} onCheckedChange={toggle} />;
}

export function PriceListClient({ items, costCodes }: { items: PriceListItem[]; costCodes: CostCode[] }) {
  const costCodeById = new Map(costCodes.map((cc) => [cc.id, cc]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddPriceListItemDialog costCodes={costCodes} />
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Cost code</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Unit cost</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No price list items yet.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell>{costCodeById.get(item.costCodeId)?.code ?? "—"}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                <TableCell>
                  <ActiveToggle item={item} />
                </TableCell>
                <TableCell>
                  <EditPriceListItemDialog item={item} costCodes={costCodes} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
