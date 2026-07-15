"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Decimal, explodeAssembly } from "@pm4mep/domain";
import {
  AssemblyComponentCreateSchema,
  type AssemblyComponentCreate,
  type AssemblyWithComponents,
  type LaborRate,
  type PriceListItem,
} from "@pm4mep/shared-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency, formatCurrencyPrecise } from "@/lib/format";
import { addAssemblyComponent, removeAssemblyComponent, updateAssembly } from "../actions";

const COST_TYPE_LABELS: Record<string, string> = {
  labor: "Labor",
  material: "Material",
  equipment: "Equipment",
  subcontract: "Subcontract",
  other: "Other",
};

function AddComponentDialog({
  assemblyId,
  priceListItems,
  laborRates,
}: {
  assemblyId: string;
  priceListItems: PriceListItem[];
  laborRates: LaborRate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssemblyComponentCreate>({
    resolver: zodResolver(AssemblyComponentCreateSchema),
    defaultValues: { componentType: "PriceListItem", quantityPerUnit: 1 },
  });

  const componentType = watch("componentType");

  async function submit(values: AssemblyComponentCreate) {
    setServerError(null);
    const result = await addAssemblyComponent(assemblyId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add component</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add component</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Component type</Label>
            <Select
              value={componentType}
              onValueChange={(value) => {
                if (!value) return;
                setValue("componentType", value as AssemblyComponentCreate["componentType"]);
                setValue("priceListItemId", undefined);
                setValue("laborRateId", undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {(value: string) => (value === "LaborRate" ? "Labor" : "Material / Equipment")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PriceListItem">Material / Equipment</SelectItem>
                <SelectItem value="LaborRate">Labor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {componentType === "PriceListItem" ? (
            <div className="flex flex-col gap-2">
              <Label>Price list item</Label>
              <Select
                // Always a defined string (never undefined) so the Select
                // stays controlled from the first render — otherwise it
                // starts uncontrolled and flips to controlled on first
                // selection, which Base UI (like React) warns about.
                value={watch("priceListItemId") ?? ""}
                onValueChange={(value) => value && setValue("priceListItemId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item">
                    {(value: string) => priceListItems.find((p) => p.id === value)?.description ?? "Select an item"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {priceListItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.description} ({formatCurrencyPrecise(item.unitCost)}/{item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Labor rate</Label>
              <Select
                value={watch("laborRateId") ?? ""}
                onValueChange={(value) => value && setValue("laborRateId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a rate">
                    {(value: string) => laborRates.find((l) => l.id === value)?.classification ?? "Select a rate"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {laborRates.map((rate) => (
                    <SelectItem key={rate.id} value={rate.id}>
                      {rate.classification} ({formatCurrencyPrecise(rate.burdenedHourlyRate)}/hr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="quantityPerUnit">
              {componentType === "LaborRate" ? "Hours per assembly unit" : "Quantity per assembly unit"}
            </Label>
            <Input
              id="quantityPerUnit"
              type="number"
              step="0.0001"
              {...register("quantityPerUnit", { valueAsNumber: true })}
            />
            {errors.quantityPerUnit && (
              <p className="text-sm text-destructive">{errors.quantityPerUnit.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add component"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActiveToggle({ assemblyId, active }: { assemblyId: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await updateAssembly(assemblyId, { active: !active });
    setPending(false);
    router.refresh();
  }

  return <Switch checked={active} disabled={pending} onCheckedChange={toggle} />;
}

function RemoveComponentButton({ assemblyId, componentId }: { assemblyId: string; componentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    await removeAssemblyComponent(assemblyId, componentId);
    setPending(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
      Remove
    </Button>
  );
}

function ExplodePreview({ assembly }: { assembly: AssemblyWithComponents }) {
  const [quantity, setQuantity] = useState("1");

  const preview = useMemo(() => {
    const qty = new Decimal(quantity || "0");
    if (qty.isNaN() || qty.lessThanOrEqualTo(0) || assembly.components.length === 0) {
      return null;
    }
    const lines = explodeAssembly(
      assembly.id,
      assembly.components.map((c) => ({
        componentType: c.componentType,
        quantityPerUnit: new Decimal(c.quantityPerUnit),
        description: c.description,
        unit: c.unit,
        unitCost: new Decimal(c.unitCost),
        costType: c.costType,
        priceListItemId: c.priceListItemId,
        laborRateId: c.laborRateId,
        costCodeId: null,
      })),
      qty,
    );
    const total = lines.reduce((sum, line) => sum.plus(line.extendedCost), new Decimal(0));
    return { lines, total };
  }, [assembly, quantity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Explode preview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="preview-quantity">Quantity ({assembly.unit})</Label>
            <Input
              id="preview-quantity"
              type="number"
              step="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
        {preview ? (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Extended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{COST_TYPE_LABELS[line.costType]}</Badge>
                    </TableCell>
                    <TableCell>
                      {line.quantity.toString()} {line.unit}
                    </TableCell>
                    <TableCell>{formatCurrencyPrecise(line.unitCost.toNumber())}</TableCell>
                    <TableCell>{formatCurrency(line.extendedCost.toNumber())}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    Total
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(preview.total.toNumber())}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a quantity above to preview the exploded line items.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AssemblyDetailClient({
  assembly,
  priceListItems,
  laborRates,
}: {
  assembly: AssemblyWithComponents;
  priceListItems: PriceListItem[];
  laborRates: LaborRate[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{assembly.name}</h1>
          <p className="text-muted-foreground">
            {assembly.category ? `${assembly.category} · ` : ""}
            Per {assembly.unit}
            {assembly.description ? ` — ${assembly.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active</span>
          <ActiveToggle assemblyId={assembly.id} active={assembly.active} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Components</CardTitle>
          <AddComponentDialog assemblyId={assembly.id} priceListItems={priceListItems} laborRates={laborRates} />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty / unit</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assembly.components.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No components yet.
                    </TableCell>
                  </TableRow>
                )}
                {assembly.components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{COST_TYPE_LABELS[component.costType]}</Badge>
                    </TableCell>
                    <TableCell>
                      {component.quantityPerUnit} {component.unit}
                    </TableCell>
                    <TableCell>{formatCurrencyPrecise(component.unitCost)}</TableCell>
                    <TableCell>
                      <RemoveComponentButton assemblyId={assembly.id} componentId={component.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ExplodePreview assembly={assembly} />
    </div>
  );
}
