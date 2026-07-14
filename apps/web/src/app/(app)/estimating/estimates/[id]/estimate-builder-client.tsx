"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ALLOWED_TRANSITIONS } from "@pm4mep/domain";
import {
  CostTypeSchema,
  EstimateLineItemFromAssemblyCreateSchema,
  EstimateLineItemManualCreateSchema,
  EstimateLineItemUpdateSchema,
  EstimateSectionCreateSchema,
  type Assembly,
  type CostCode,
  type EstimateLineItem,
  type EstimateLineItemFromAssemblyCreate,
  type EstimateLineItemManualCreate,
  type EstimateLineItemUpdate,
  type EstimateSectionCreate,
  type EstimateStatus,
  type EstimateWithDetails,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  addFromAssembly,
  addManualLineItem,
  addSection,
  removeLineItem,
  removeSection,
  transitionEstimateStatus,
  updateEstimate,
  updateLineItem,
} from "../actions";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  Draft: "secondary",
  Submitted: "default",
  Won: "default",
  Lost: "destructive",
};

const COST_TYPE_LABELS: Record<string, string> = {
  labor: "Labor",
  material: "Material",
  equipment: "Equipment",
  subcontract: "Subcontract",
  other: "Other",
};

const MARKUP_FIELDS: Array<{ key: keyof MarkupFormValues; label: string }> = [
  { key: "laborMarkupPct", label: "Labor markup %" },
  { key: "materialMarkupPct", label: "Material markup %" },
  { key: "equipmentMarkupPct", label: "Equipment markup %" },
  { key: "subcontractMarkupPct", label: "Subcontract markup %" },
  { key: "otherMarkupPct", label: "Other markup %" },
  { key: "overheadPct", label: "Overhead %" },
  { key: "profitPct", label: "Profit %" },
  { key: "contingencyPct", label: "Contingency %" },
  { key: "taxPct", label: "Tax %" },
];

interface MarkupFormValues {
  laborMarkupPct: number;
  materialMarkupPct: number;
  equipmentMarkupPct: number;
  subcontractMarkupPct: number;
  otherMarkupPct: number;
  overheadPct: number;
  profitPct: number;
  contingencyPct: number;
  taxPct: number;
}

function StatusControls({ estimateId, status }: { estimateId: string; status: EstimateStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<EstimateStatus | null>(null);
  const nextStatuses = ALLOWED_TRANSITIONS[status];

  async function transition(next: EstimateStatus) {
    setPending(next);
    await transitionEstimateStatus(estimateId, next);
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      {nextStatuses.map((next) => (
        <Button key={next} variant="outline" size="sm" disabled={pending !== null} onClick={() => transition(next)}>
          {pending === next ? "…" : `Mark ${next}`}
        </Button>
      ))}
    </div>
  );
}

function MarkupConfigCard({ estimate }: { estimate: EstimateWithDetails }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<MarkupFormValues>({
    defaultValues: {
      laborMarkupPct: estimate.laborMarkupPct,
      materialMarkupPct: estimate.materialMarkupPct,
      equipmentMarkupPct: estimate.equipmentMarkupPct,
      subcontractMarkupPct: estimate.subcontractMarkupPct,
      otherMarkupPct: estimate.otherMarkupPct,
      overheadPct: estimate.overheadPct,
      profitPct: estimate.profitPct,
      contingencyPct: estimate.contingencyPct,
      taxPct: estimate.taxPct,
    },
  });

  async function submit(values: MarkupFormValues) {
    setServerError(null);
    const result = await updateEstimate(estimate.id, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Markup configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {MARKUP_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="number"
                  step="0.01"
                  {...register(field.key, { valueAsNumber: true })}
                />
              </div>
            ))}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <div>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? "Saving…" : "Save markup config"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FromAssemblyForm({
  estimateId,
  sectionId,
  assemblies,
  onSuccess,
}: {
  estimateId: string;
  sectionId: string;
  assemblies: Assembly[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EstimateLineItemFromAssemblyCreate>({
    resolver: zodResolver(EstimateLineItemFromAssemblyCreateSchema),
    defaultValues: { assemblyId: assemblies[0]?.id ?? "", quantity: 1 },
  });

  async function submit(values: EstimateLineItemFromAssemblyCreate) {
    setServerError(null);
    const result = await addFromAssembly(estimateId, sectionId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    onSuccess();
    router.refresh();
  }

  if (assemblies.length === 0) {
    return <p className="text-sm text-muted-foreground">No active assemblies yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Assembly</Label>
        <Select
          value={watch("assemblyId") ?? ""}
          onValueChange={(value) => value && setValue("assemblyId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an assembly">
              {(value: string) => assemblies.find((a) => a.id === value)?.name ?? "Select an assembly"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {assemblies.map((assembly) => (
              <SelectItem key={assembly.id} value={assembly.id}>
                {assembly.name} (per {assembly.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input id="quantity" type="number" step="0.0001" {...register("quantity", { valueAsNumber: true })} />
        {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding…" : "Add from assembly"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ManualLineItemForm({
  estimateId,
  sectionId,
  costCodes,
  onSuccess,
}: {
  estimateId: string;
  sectionId: string;
  costCodes: CostCode[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EstimateLineItemManualCreate>({
    resolver: zodResolver(EstimateLineItemManualCreateSchema),
    defaultValues: { description: "", unit: "", unitCost: 0, quantity: 1, costType: "material" },
  });

  async function submit(values: EstimateLineItemManualCreate) {
    setServerError(null);
    const result = await addManualLineItem(estimateId, sectionId, values);
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
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Cost type</Label>
          <Select
            value={watch("costType")}
            onValueChange={(value) => value && setValue("costType", value as EstimateLineItemManualCreate["costType"])}
          >
            <SelectTrigger>
              <SelectValue>{(value: string) => COST_TYPE_LABELS[value] ?? value}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CostTypeSchema.options.map((type) => (
                <SelectItem key={type} value={type}>
                  {COST_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Cost code (optional)</Label>
          <Select
            value={watch("costCodeId") ?? ""}
            onValueChange={(value) => setValue("costCodeId", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="None">
                {(value: string) => costCodes.find((c) => c.id === value)?.code ?? "None"}
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
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" placeholder="EA, LF…" {...register("unit")} />
          {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" type="number" step="0.0001" {...register("quantity", { valueAsNumber: true })} />
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
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
          {isSubmitting ? "Adding…" : "Add line item"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddLineItemDialog({
  estimateId,
  sectionId,
  assemblies,
  costCodes,
}: {
  estimateId: string;
  sectionId: string;
  assemblies: Assembly[];
  costCodes: CostCode[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add line item</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add line item</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="assembly">
          <TabsList>
            <TabsTrigger value="assembly">From Assembly</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          <TabsContent value="assembly">
            <FromAssemblyForm
              estimateId={estimateId}
              sectionId={sectionId}
              assemblies={assemblies}
              onSuccess={() => setOpen(false)}
            />
          </TabsContent>
          <TabsContent value="manual">
            <ManualLineItemForm
              estimateId={estimateId}
              sectionId={sectionId}
              costCodes={costCodes}
              onSuccess={() => setOpen(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AddSectionDialog({ estimateId }: { estimateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EstimateSectionCreate>({
    resolver: zodResolver(EstimateSectionCreateSchema),
    defaultValues: { name: "" },
  });

  async function submit(values: EstimateSectionCreate) {
    setServerError(null);
    const result = await addSection(estimateId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add section</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="section-name">Section name</Label>
            <Input id="section-name" placeholder="Rooftop Units" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveButton({ onRemove }: { onRemove: () => Promise<void> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await onRemove();
    setPending(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={pending}>
      Remove
    </Button>
  );
}

function EditLineItemDialog({ estimateId, lineItem }: { estimateId: string; lineItem: EstimateLineItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EstimateLineItemUpdate>({
    resolver: zodResolver(EstimateLineItemUpdateSchema),
    defaultValues: {
      description: lineItem.description,
      unit: lineItem.unit,
      unitCost: lineItem.unitCost,
      quantity: lineItem.quantity,
      markupOverridePct: lineItem.markupOverridePct ?? undefined,
    },
  });

  async function submit(values: EstimateLineItemUpdate) {
    setServerError(null);
    const result = await updateLineItem(estimateId, lineItem.id, {
      ...values,
      markupOverridePct:
        values.markupOverridePct === undefined || Number.isNaN(values.markupOverridePct)
          ? null
          : values.markupOverridePct,
    });
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset({
            description: lineItem.description,
            unit: lineItem.unit,
            unitCost: lineItem.unitCost,
            quantity: lineItem.quantity,
            markupOverridePct: lineItem.markupOverridePct ?? undefined,
          });
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit line item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input id="edit-description" {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <Input id="edit-unit" {...register("unit")} />
              {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input id="edit-quantity" type="number" step="0.0001" {...register("quantity", { valueAsNumber: true })} />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-unitCost">Unit cost ($)</Label>
              <Input id="edit-unitCost" type="number" step="0.0001" {...register("unitCost", { valueAsNumber: true })} />
              {errors.unitCost && <p className="text-sm text-destructive">{errors.unitCost.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-markupOverridePct">Markup override % (optional)</Label>
            <Input
              id="edit-markupOverridePct"
              type="number"
              step="0.01"
              placeholder="Use estimate default"
              {...register("markupOverridePct", {
                setValueAs: (value) => (value === "" ? undefined : Number(value)),
              })}
            />
            {errors.markupOverridePct && (
              <p className="text-sm text-destructive">{errors.markupOverridePct.message}</p>
            )}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({
  estimate,
  section,
  assemblies,
  costCodes,
}: {
  estimate: EstimateWithDetails;
  section: EstimateWithDetails["sections"][number];
  assemblies: Assembly[];
  costCodes: CostCode[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{section.name}</CardTitle>
        <div className="flex items-center gap-2">
          <AddLineItemDialog
            estimateId={estimate.id}
            sectionId={section.id}
            assemblies={assemblies}
            costCodes={costCodes}
          />
          <RemoveButton onRemove={() => removeSection(estimate.id, section.id).then(() => undefined)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit cost</TableHead>
                <TableHead>Extended</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.lineItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No line items yet.
                  </TableCell>
                </TableRow>
              )}
              {section.lineItems.map((lineItem) => (
                <TableRow key={lineItem.id}>
                  <TableCell className="font-medium">{lineItem.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{COST_TYPE_LABELS[lineItem.costType]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lineItem.sourceType}</TableCell>
                  <TableCell>
                    {lineItem.quantity} {lineItem.unit}
                  </TableCell>
                  <TableCell>${lineItem.unitCost.toFixed(2)}</TableCell>
                  <TableCell>${lineItem.extendedCost.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <EditLineItemDialog estimateId={estimate.id} lineItem={lineItem} />
                      <RemoveButton onRemove={() => removeLineItem(estimate.id, lineItem.id).then(() => undefined)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ estimate }: { estimate: EstimateWithDetails }) {
  const router = useRouter();
  const [overrideValue, setOverrideValue] = useState(
    estimate.finalSellPriceOverride?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);
  const { rollup } = estimate;

  async function saveOverride() {
    setSaving(true);
    await updateEstimate(estimate.id, {
      finalSellPriceOverride: overrideValue === "" ? null : Number(overrideValue),
    });
    setSaving(false);
    router.refresh();
  }

  const variance = estimate.finalSellPriceOverride
    ? estimate.finalSellPriceOverride - rollup.calculatedSellPrice
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {(["labor", "material", "equipment", "subcontract", "other"] as const).map((type) => (
          <div key={type} className="flex justify-between">
            <span className="text-muted-foreground">{COST_TYPE_LABELS[type]} (marked up)</span>
            <span>${rollup.markedUpByType[type].toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Marked-up subtotal</span>
          <span>${rollup.totalMarkedUpCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Overhead</span>
          <span>${rollup.overheadAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Profit</span>
          <span>${rollup.profitAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contingency</span>
          <span>${rollup.contingencyAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Calculated sell price</span>
          <span>${rollup.calculatedSellPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>With tax ({estimate.taxPct}%)</span>
          <span>${rollup.resolvedSellPriceWithTax.toFixed(2)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <Label htmlFor="override">Final sell price override</Label>
          <div className="flex gap-2">
            <Input
              id="override"
              type="number"
              step="0.01"
              placeholder="Use calculated"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
            />
            <Button variant="outline" onClick={saveOverride} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {estimate.finalSellPriceOverride !== null && (
            <p className="text-xs text-muted-foreground">
              {variance >= 0 ? "+" : ""}
              ${variance.toFixed(2)} vs. calculated
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProposalLinks({ estimateId }: { estimateId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <a href={`/estimating/estimates/${estimateId}/proposal?internal=false`} target="_blank" rel="noreferrer">
            Customer PDF
          </a>
        }
      />
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <a href={`/estimating/estimates/${estimateId}/proposal?internal=true`} target="_blank" rel="noreferrer">
            Internal PDF
          </a>
        }
      />
    </div>
  );
}

export function EstimateBuilderClient({
  estimate,
  assemblies,
  costCodes,
}: {
  estimate: EstimateWithDetails;
  assemblies: Assembly[];
  costCodes: CostCode[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {estimate.number} — {estimate.name}
          </h1>
          <p className="text-muted-foreground">{estimate.customerName}</p>
        </div>
        <div className="flex items-center gap-4">
          <ProposalLinks estimateId={estimate.id} />
          <StatusControls estimateId={estimate.id} status={estimate.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex justify-end">
            <AddSectionDialog estimateId={estimate.id} />
          </div>
          {estimate.sections.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No sections yet — add one to start building the estimate.
              </CardContent>
            </Card>
          )}
          {estimate.sections.map((section) => (
            <SectionCard
              key={section.id}
              estimate={estimate}
              section={section}
              assemblies={assemblies}
              costCodes={costCodes}
            />
          ))}
          <MarkupConfigCard estimate={estimate} />
        </div>
        <div>
          <SummaryCard estimate={estimate} />
        </div>
      </div>
    </div>
  );
}
