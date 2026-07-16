"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ALLOWED_TRANSITIONS } from "@pm4mep/domain";
import { Pencil } from "lucide-react";
import {
  CostTypeSchema,
  EstimateLineItemFromAssemblyCreateSchema,
  EstimateLineItemFromCatalogCreateSchema,
  EstimateLineItemManualCreateSchema,
  EstimateLineItemUpdateSchema,
  EstimateScopeDetailsUpdateSchema,
  EstimateSectionCreateSchema,
  EstimateUpdateSchema,
  type Assembly,
  type CostCode,
  type EstimateLineItem,
  type EstimateLineItemFromAssemblyCreate,
  type EstimateLineItemFromCatalogCreate,
  type EstimateLineItemManualCreate,
  type EstimateLineItemUpdate,
  type EstimateScopeDetailsUpdate,
  type EstimateSectionCreate,
  type EstimateStatus,
  type EstimateWithDetails,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatCurrencyPrecise } from "@/lib/format";
import {
  addFromAssembly,
  addFromCatalog,
  addManualLineItem,
  addSection,
  removeLineItem,
  removeSection,
  transitionEstimateStatus,
  updateEstimate,
  updateLineItem,
} from "../actions";
import { createProjectFromEstimate } from "../../../projects/actions";

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

const SCOPE_FIELDS: Array<{ key: keyof EstimateScopeDetailsUpdate; label: string; placeholder: string }> = [
  { key: "scopeDescription", label: "Scope of work", placeholder: "Describe the work to be performed…" },
  { key: "inclusions", label: "Inclusions", placeholder: "What's included in this price…" },
  { key: "exclusions", label: "Exclusions", placeholder: "What's excluded from this price…" },
  { key: "termsAndConditions", label: "Terms & conditions", placeholder: "Payment terms, warranty, etc…" },
];

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

function ScopeDetailsCard({ estimate }: { estimate: EstimateWithDetails }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<EstimateScopeDetailsUpdate>({
    resolver: zodResolver(EstimateScopeDetailsUpdateSchema),
    defaultValues: {
      scopeDescription: estimate.scopeDescription ?? "",
      inclusions: estimate.inclusions ?? "",
      exclusions: estimate.exclusions ?? "",
      termsAndConditions: estimate.termsAndConditions ?? "",
    },
  });

  async function submit(values: EstimateScopeDetailsUpdate) {
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
        <CardTitle>Proposal details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          {SCOPE_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Textarea id={field.key} rows={4} placeholder={field.placeholder} {...register(field.key)} />
            </div>
          ))}
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <div>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? "Saving…" : "Save proposal details"}
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

function FromCatalogForm({
  estimateId,
  sectionId,
  priceListItems,
  onSuccess,
}: {
  estimateId: string;
  sectionId: string;
  priceListItems: PriceListItem[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EstimateLineItemFromCatalogCreate>({
    resolver: zodResolver(EstimateLineItemFromCatalogCreateSchema),
    defaultValues: { priceListItemId: "", quantity: 1 },
  });

  const selectedId = watch("priceListItemId");
  const selected = priceListItems.find((item) => item.id === selectedId);
  const term = search.trim().toLowerCase();
  const filtered = term
    ? priceListItems.filter((item) =>
        [item.description, item.manufacturer, item.modelNumber, item.sku]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term)),
      )
    : priceListItems;

  async function submit(values: EstimateLineItemFromCatalogCreate) {
    setServerError(null);
    const result = await addFromCatalog(estimateId, sectionId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    onSuccess();
    router.refresh();
  }

  if (priceListItems.length === 0) {
    return <p className="text-sm text-muted-foreground">No catalog items yet — add some from the price list.</p>;
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Catalog item</Label>
        <Input
          placeholder="Search by description, manufacturer, model, or SKU…"
          value={selected ? "" : search}
          onChange={(e) => {
            setSearch(e.target.value);
            setValue("priceListItemId", "");
          }}
        />
        {selected ? (
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span>
              {[selected.manufacturer, selected.modelNumber].filter(Boolean).join(" ") || selected.description}
              {" — "}
              {selected.description}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setValue("priceListItemId", "")}>
              Change
            </Button>
          </div>
        ) : (
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {filtered.slice(0, 20).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setValue("priceListItemId", item.id)}
                className="flex flex-col rounded-md border border-transparent px-3 py-2 text-left text-sm hover:border-border hover:bg-accent"
              >
                <span className="font-medium">
                  {[item.manufacturer, item.modelNumber].filter(Boolean).join(" ") || item.description}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.description} · {formatCurrencyPrecise(item.unitCost)}/{item.unit}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matching catalog items.</p>
            )}
          </div>
        )}
        {errors.priceListItemId && <p className="text-sm text-destructive">Select a catalog item.</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="catalog-quantity">Quantity</Label>
        <Input id="catalog-quantity" type="number" step="0.0001" {...register("quantity", { valueAsNumber: true })} />
        {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || !selectedId}>
          {isSubmitting ? "Adding…" : "Add from catalog"}
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
  priceListItems,
}: {
  estimateId: string;
  sectionId: string;
  assemblies: Assembly[];
  costCodes: CostCode[];
  priceListItems: PriceListItem[];
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
            <TabsTrigger value="catalog">From Catalog</TabsTrigger>
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
          <TabsContent value="catalog">
            <FromCatalogForm
              estimateId={estimateId}
              sectionId={sectionId}
              priceListItems={priceListItems}
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
  priceListItems,
}: {
  estimate: EstimateWithDetails;
  section: EstimateWithDetails["sections"][number];
  assemblies: Assembly[];
  costCodes: CostCode[];
  priceListItems: PriceListItem[];
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
            priceListItems={priceListItems}
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
                  <TableCell>{formatCurrencyPrecise(lineItem.unitCost)}</TableCell>
                  <TableCell>{formatCurrency(lineItem.extendedCost)}</TableCell>
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
            <span>{formatCurrency(rollup.markedUpByType[type])}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Marked-up subtotal</span>
          <span>{formatCurrency(rollup.totalMarkedUpCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Overhead</span>
          <span>{formatCurrency(rollup.overheadAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Profit</span>
          <span>{formatCurrency(rollup.profitAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contingency</span>
          <span>{formatCurrency(rollup.contingencyAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Calculated sell price</span>
          <span>{formatCurrency(rollup.calculatedSellPrice)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>With tax ({estimate.taxPct}%)</span>
          <span>{formatCurrency(rollup.resolvedSellPriceWithTax)}</span>
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
              {formatCurrency(variance)} vs. calculated
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

// A Won estimate can be converted into a Project at most once (see
// Project.estimateId's unique constraint) — shows "Create project" until
// that happens, then "View project" once estimate.projectId is set.
function ProjectLinkControl({ estimateId, status, projectId }: { estimateId: string; status: EstimateStatus; projectId: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (status !== "Won") {
    return null;
  }

  if (projectId) {
    return (
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`/projects/${projectId}`}>View project</Link>}
      />
    );
  }

  async function handleCreate() {
    setPending(true);
    setServerError(null);
    const result = await createProjectFromEstimate(estimateId, {});
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      setPending(false);
      return;
    }
    router.push(`/projects/${result.data.id}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleCreate} disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
      {serverError && <p className="text-xs text-destructive">{serverError}</p>}
    </div>
  );
}

function EditEstimateNameDialog({ estimateId, name }: { estimateId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({
    resolver: zodResolver(EstimateUpdateSchema.pick({ name: true }).required()),
    defaultValues: { name },
  });

  async function submit(values: { name: string }) {
    setServerError(null);
    const result = await updateEstimate(estimateId, values);
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
        if (next) reset({ name });
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Edit estimate name">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit estimate name</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="estimate-name">Estimate name</Label>
            <Input id="estimate-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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

export function EstimateBuilderClient({
  estimate,
  assemblies,
  costCodes,
  priceListItems,
}: {
  estimate: EstimateWithDetails;
  assemblies: Assembly[];
  costCodes: CostCode[];
  priceListItems: PriceListItem[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {estimate.number} — {estimate.name}
            </h1>
            <EditEstimateNameDialog estimateId={estimate.id} name={estimate.name} />
          </div>
          <p className="text-muted-foreground">{estimate.customerName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ProposalLinks estimateId={estimate.id} />
          <ProjectLinkControl estimateId={estimate.id} status={estimate.status} projectId={estimate.projectId} />
          <StatusControls estimateId={estimate.id} status={estimate.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ScopeDetailsCard estimate={estimate} />
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
              priceListItems={priceListItems}
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
