"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  LaborRateCreateSchema,
  type CostCode,
  type LaborRate,
  type LaborRateCreate,
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
import { formatCurrencyPrecise } from "@/lib/format";
import { createLaborRate, updateLaborRate } from "./actions";

function LaborRateForm({
  costCodes,
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  costCodes: CostCode[];
  defaultValues?: LaborRateCreate;
  onSubmit: (values: LaborRateCreate) => Promise<{ ok: boolean; error?: string }>;
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
  } = useForm<LaborRateCreate>({
    resolver: zodResolver(LaborRateCreateSchema),
    defaultValues: defaultValues ?? {
      costCodeId: costCodes[0]?.id ?? "",
      classification: "",
      burdenedHourlyRate: 0,
    },
  });

  async function submit(values: LaborRateCreate) {
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
        <Label htmlFor="classification">Classification</Label>
        <Input id="classification" placeholder="Journeyman Pipefitter…" {...register("classification")} />
        {errors.classification && (
          <p className="text-sm text-destructive">{errors.classification.message}</p>
        )}
      </div>
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
        <Label htmlFor="burdenedHourlyRate">Burdened hourly rate ($/hr)</Label>
        <Input
          id="burdenedHourlyRate"
          type="number"
          step="0.0001"
          {...register("burdenedHourlyRate", { valueAsNumber: true })}
        />
        {errors.burdenedHourlyRate && (
          <p className="text-sm text-destructive">{errors.burdenedHourlyRate.message}</p>
        )}
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

function AddLaborRateDialog({ costCodes }: { costCodes: CostCode[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add labor rate</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add labor rate</DialogTitle>
        </DialogHeader>
        <LaborRateForm
          costCodes={costCodes}
          submitLabel="Add labor rate"
          onSubmit={async (values) => createLaborRate(values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditLaborRateDialog({ laborRate, costCodes }: { laborRate: LaborRate; costCodes: CostCode[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit labor rate</DialogTitle>
        </DialogHeader>
        <LaborRateForm
          costCodes={costCodes}
          defaultValues={{
            costCodeId: laborRate.costCodeId,
            classification: laborRate.classification,
            burdenedHourlyRate: laborRate.burdenedHourlyRate,
          }}
          submitLabel="Save changes"
          onSubmit={async (values) => updateLaborRate(laborRate.id, values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ActiveToggle({ laborRate }: { laborRate: LaborRate }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await updateLaborRate(laborRate.id, { active: !laborRate.active });
    setPending(false);
    router.refresh();
  }

  return <Switch checked={laborRate.active} disabled={pending} onCheckedChange={toggle} />;
}

export function LaborRatesClient({
  laborRates,
  costCodes,
}: {
  laborRates: LaborRate[];
  costCodes: CostCode[];
}) {
  const costCodeById = new Map(costCodes.map((cc) => [cc.id, cc]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddLaborRateDialog costCodes={costCodes} />
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classification</TableHead>
              <TableHead>Cost code</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {laborRates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No labor rates yet.
                </TableCell>
              </TableRow>
            )}
            {laborRates.map((laborRate) => (
              <TableRow key={laborRate.id}>
                <TableCell className="font-medium">{laborRate.classification}</TableCell>
                <TableCell>{costCodeById.get(laborRate.costCodeId)?.code ?? "—"}</TableCell>
                <TableCell>{formatCurrencyPrecise(laborRate.burdenedHourlyRate)}/hr</TableCell>
                <TableCell>
                  <ActiveToggle laborRate={laborRate} />
                </TableCell>
                <TableCell>
                  <EditLaborRateDialog laborRate={laborRate} costCodes={costCodes} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
