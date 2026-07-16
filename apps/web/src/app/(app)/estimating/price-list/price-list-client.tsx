"use client";

import { ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CATALOG_PHOTO_CONTENT_TYPES,
  CATALOG_SPEC_SHEET_CONTENT_TYPES,
  PriceListItemCreateSchema,
  type CatalogWebSearchResult,
  type CostCode,
  type PriceListItem,
  type PriceListItemCreate,
  type PriceListItemPhotoUploadUrlRequest,
  type PriceListItemSpecSheetUploadUrlRequest,
} from "@pm4mep/shared-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrencyPrecise } from "@/lib/format";
import {
  createPriceListItem,
  createPriceListItemFromWebResult,
  getPriceListItemPhotoUploadUrl,
  getPriceListItemSpecSheetUploadUrl,
  searchCatalogWeb,
  updatePriceListItem,
} from "./actions";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_SPEC_SHEET_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 6;

// Shared by the photo and spec-sheet widgets below: request a presigned URL,
// PUT the file straight to R2, return the public URL. Mirrors the pattern
// in settings/company/company-client.tsx's LogoUpload, but doesn't PATCH an
// owning record immediately — the surrounding PriceListItemForm collects
// the resulting URL(s) into its own submit payload instead.
async function uploadToR2<TContentType extends string>(
  file: File,
  getUploadUrl: (input: { contentType: TContentType }) => Promise<
    { ok: true; data: { uploadUrl: string; publicUrl: string } } | { ok: false; error: string }
  >,
): Promise<{ url: string } | { error: string }> {
  const urlResult = await getUploadUrl({ contentType: file.type as TContentType });
  if (!urlResult.ok) return { error: urlResult.error };

  const putRes = await fetch(urlResult.data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) return { error: "Upload failed — try again." };

  return { url: urlResult.data.publicUrl };
}

function PhotoUploadWidget({ photoUrls, onChange }: { photoUrls: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const remaining = MAX_PHOTOS - photoUrls.length;
    if (files.length > remaining) {
      setError(`You can add up to ${MAX_PHOTOS} photos (${remaining} more allowed).`);
      return;
    }
    for (const file of files) {
      if (!(CATALOG_PHOTO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
        setError("Photos must be PNG or JPEG images.");
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError("Each photo must be smaller than 5MB.");
        return;
      }
    }

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of files) {
      const result = await uploadToR2<PriceListItemPhotoUploadUrlRequest["contentType"]>(
        file,
        getPriceListItemPhotoUploadUrl,
      );
      if ("error" in result) {
        setError(result.error);
        setUploading(false);
        return;
      }
      uploaded.push(result.url);
    }
    setUploading(false);
    onChange([...photoUrls, ...uploaded]);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Photos</Label>
      {photoUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photoUrls.map((url) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="h-16 w-16 rounded border border-border object-contain p-1" />
              <button
                type="button"
                onClick={() => onChange(photoUrls.filter((u) => u !== url))}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {photoUrls.length < MAX_PHOTOS && (
        <Input
          type="file"
          accept="image/png,image/jpeg"
          multiple
          disabled={uploading}
          onChange={handleChange}
          className="max-w-xs"
        />
      )}
      <p className="text-xs text-muted-foreground">PNG or JPEG, up to 5MB each, {MAX_PHOTOS} max.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SpecSheetUploadWidget({
  specSheetUrl,
  onChange,
}: {
  specSheetUrl: string | undefined;
  onChange: (url: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!(CATALOG_SPEC_SHEET_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setError("Spec sheet must be a PDF.");
      return;
    }
    if (file.size > MAX_SPEC_SHEET_BYTES) {
      setError("Spec sheet must be smaller than 10MB.");
      return;
    }

    setUploading(true);
    const result = await uploadToR2<PriceListItemSpecSheetUploadUrlRequest["contentType"]>(
      file,
      getPriceListItemSpecSheetUploadUrl,
    );
    setUploading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onChange(result.url);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Spec sheet</Label>
      {specSheetUrl ? (
        <div className="flex items-center gap-2">
          <a href={specSheetUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            View current spec sheet
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Remove
          </Button>
        </div>
      ) : (
        <Input type="file" accept="application/pdf" disabled={uploading} onChange={handleChange} className="max-w-xs" />
      )}
      <p className="text-xs text-muted-foreground">PDF, up to 10MB.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

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
  const [photoUrls, setPhotoUrls] = useState<string[]>(defaultValues?.photoUrls ?? []);
  const [specSheetUrl, setSpecSheetUrl] = useState<string | undefined>(defaultValues?.specSheetUrl);
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
    const result = await onSubmit({ ...values, photoUrls, specSheetUrl });
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
      <PhotoUploadWidget photoUrls={photoUrls} onChange={setPhotoUrls} />
      <SpecSheetUploadWidget specSheetUrl={specSheetUrl} onChange={setSpecSheetUrl} />
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
            photoUrls: item.photoUrls,
            specSheetUrl: item.specSheetUrl ?? undefined,
          }}
          submitLabel="Save changes"
          onSubmit={async (values) => updatePriceListItem(item.id, values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// The review step after selecting one or more web search results — cost
// code and unit cost are never known from the web, so they're required here
// even though everything else arrives pre-filled. Description/manufacturer/
// model are shown read-only (editable afterward via the normal Edit dialog)
// to keep a multi-item review form manageable. Submits each selected result
// through the from-web-result endpoint sequentially; imageUrl/specSheetUrl
// are threaded through directly from the search result rather than via a
// form field, since they're never user-editable here.
function WebResultsBatchForm({
  results,
  costCodes,
  onSuccess,
}: {
  results: CatalogWebSearchResult[];
  costCodes: CostCode[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [costCodeId, setCostCodeId] = useState(costCodes[0]?.id ?? "");
  const [rows, setRows] = useState(() => results.map(() => ({ unit: "", unitCost: "" })));
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function updateRow(i: number, patch: Partial<{ unit: string; unitCost: string }>) {
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function submit() {
    setSubmitting(true);
    const nextErrors: Record<number, string> = {};
    let succeeded = 0;

    for (let i = 0; i < results.length; i++) {
      const row = rows[i]!;
      const result = results[i]!;
      const unitCost = Number(row.unitCost);
      if (!row.unit.trim() || !row.unitCost.trim() || Number.isNaN(unitCost) || unitCost < 0) {
        nextErrors[i] = "Unit and unit cost are required.";
        continue;
      }
      const outcome = await createPriceListItemFromWebResult({
        costCodeId,
        description: result.description,
        manufacturer: result.manufacturer ?? undefined,
        modelNumber: result.modelNumber ?? undefined,
        unit: row.unit.trim(),
        unitCost,
        imageUrl: result.imageUrl ?? undefined,
        specSheetUrl: result.specSheetUrl ?? undefined,
      });
      if (outcome.ok) {
        succeeded++;
      } else {
        nextErrors[i] = outcome.error ?? "Failed to add.";
      }
    }

    setSubmitting(false);
    setRowErrors(nextErrors);
    if (succeeded > 0) router.refresh();
    if (Object.keys(nextErrors).length === 0) onSuccess();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Cost code (applies to all selected items)</Label>
        <Select value={costCodeId} onValueChange={(value) => value && setCostCodeId(value)}>
          <SelectTrigger>
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
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {results.map((result, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <div className="flex items-start gap-3">
              {result.imageUrl ? (
                <img
                  src={result.imageUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded border border-border object-contain p-1"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-border text-center text-[10px] leading-tight text-muted-foreground">
                  No photo found
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium">
                  {[result.manufacturer, result.modelNumber].filter(Boolean).join(" ") || result.description}
                </p>
                <p className="line-clamp-3 text-sm text-muted-foreground">{result.description}</p>
              </div>
              {result.specSheetUrl && (
                <Badge variant="secondary" className="shrink-0">
                  Spec sheet
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Unit</Label>
                <Input
                  placeholder="EA, LF…"
                  value={rows[i]!.unit}
                  onChange={(e) => updateRow(i, { unit: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Unit cost ($)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={rows[i]!.unitCost}
                  onChange={(e) => updateRow(i, { unitCost: e.target.value })}
                />
              </div>
            </div>
            {rowErrors[i] && <p className="text-xs text-destructive">{rowErrors[i]}</p>}
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button type="button" onClick={submit} disabled={submitting || !costCodeId}>
          {submitting ? "Adding…" : `Add ${results.length} item${results.length === 1 ? "" : "s"}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

function SearchWebDialog({ costCodes }: { costCodes: CostCode[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CatalogWebSearchResult[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reviewing, setReviewing] = useState(false);

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setSelected(new Set());
    const result = await searchCatalogWeb({ query: query.trim() });
    setSearching(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResults(result.data);
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function reset() {
    setQuery("");
    setResults(null);
    setSelected(new Set());
    setReviewing(false);
    setError(null);
  }

  const selectedResults = results ? Array.from(selected).map((i) => results[i]!) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline">Search the web</Button>} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{reviewing ? "Add to catalog" : "Search the web for equipment"}</DialogTitle>
        </DialogHeader>
        {reviewing ? (
          <WebResultsBatchForm
            results={selectedResults}
            costCodes={costCodes}
            onSuccess={() => {
              setOpen(false);
              reset();
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder='e.g. "Goodman 250k BTU Furnace"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
              <Button type="button" onClick={runSearch} disabled={searching || !query.trim()}>
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
            {searching && (
              <p className="text-xs text-muted-foreground">
                This can take up to a minute or two — Claude is searching the web and reading product
                pages to find real photos and spec sheets.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {results && results.length === 0 && (
              <p className="text-sm text-muted-foreground">No matches found — try a different search.</p>
            )}
            {results && results.length > 0 && (
              <>
                <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                  {results.map((result, i) => (
                    <Card
                      key={i}
                      className={`cursor-pointer ${selected.has(i) ? "ring-2 ring-primary" : "hover:bg-accent"}`}
                      onClick={() => toggle(i)}
                    >
                      <CardContent className="flex items-start gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggle(i)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 shrink-0"
                          aria-label={`Select ${result.description}`}
                        />
                        {result.imageUrl ? (
                          <img
                            src={result.imageUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded border border-border object-contain p-1"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-border text-center text-[10px] leading-tight text-muted-foreground">
                            No photo found
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium">
                            {[result.manufacturer, result.modelNumber].filter(Boolean).join(" ") ||
                              result.description}
                          </p>
                          <p className="line-clamp-3 text-sm text-muted-foreground">{result.description}</p>
                        </div>
                        {result.specSheetUrl && (
                          <Badge variant="secondary" className="shrink-0">
                            Spec sheet
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" disabled={selected.size === 0} onClick={() => setReviewing(true)}>
                    Add {selected.size || ""} selected
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}
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
      <div className="flex justify-end gap-2">
        <SearchWebDialog costCodes={costCodes} />
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
                <TableCell>{formatCurrencyPrecise(item.unitCost)}</TableCell>
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
