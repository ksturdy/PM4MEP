"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CostCodeCreateSchema, CostTypeSchema, type CostCode, type CostCodeCreate } from "@pm4mep/shared-schema";
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
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createCostCode, deleteCostCode, updateCostCode } from "./actions";

const COST_TYPE_LABELS: Record<string, string> = {
  labor: "Labor",
  material: "Material",
  equipment: "Equipment",
  subcontract: "Subcontract",
  other: "Other",
};

function CostCodeForm({
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  defaultValues?: CostCodeCreate;
  onSubmit: (values: CostCodeCreate) => Promise<{ ok: boolean; error?: string }>;
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
  } = useForm<CostCodeCreate>({
    resolver: zodResolver(CostCodeCreateSchema),
    defaultValues: defaultValues ?? { code: "", description: "", costType: "labor", defaultUnit: "" },
  });

  async function submit(values: CostCodeCreate) {
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
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" {...register("code")} />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultUnit">Default unit</Label>
          <Input id="defaultUnit" placeholder="EA, LF, HR…" {...register("defaultUnit")} />
          {errors.defaultUnit && <p className="text-sm text-destructive">{errors.defaultUnit.message}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Cost type</Label>
        <Select value={watch("costType")} onValueChange={(value) => setValue("costType", value as CostCodeCreate["costType"])}>
          <SelectTrigger>
            {/* Base UI's SelectValue shows the raw value unless given a
                children render-fn — unlike Radix, it doesn't auto-derive a
                label from the matching SelectItem's rendered children. */}
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
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddCostCodeDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add cost code</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add cost code</DialogTitle>
        </DialogHeader>
        <CostCodeForm
          submitLabel="Add cost code"
          onSubmit={async (values) => createCostCode(values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditCostCodeDialog({ costCode }: { costCode: CostCode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit cost code</DialogTitle>
        </DialogHeader>
        <CostCodeForm
          defaultValues={{
            code: costCode.code,
            description: costCode.description,
            costType: costCode.costType,
            defaultUnit: costCode.defaultUnit,
          }}
          submitLabel="Save changes"
          onSubmit={async (values) => updateCostCode(costCode.id, values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteCostCodeButton({ costCode }: { costCode: CostCode }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const confirmed = await confirm({
      title: `Delete cost code ${costCode.code}?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    setPending(true);
    const result = await deleteCostCode(costCode.id);
    setPending(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleClick}>
      Delete
    </Button>
  );
}

function ActiveToggle({ costCode }: { costCode: CostCode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await updateCostCode(costCode.id, { active: !costCode.active });
    setPending(false);
    router.refresh();
  }

  return <Switch checked={costCode.active} disabled={pending} onCheckedChange={toggle} />;
}

export function CostCodesClient({ costCodes }: { costCodes: CostCode[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddCostCodeDialog />
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {costCodes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No cost codes yet.
                </TableCell>
              </TableRow>
            )}
            {costCodes.map((costCode) => (
              <TableRow key={costCode.id}>
                <TableCell className="font-medium">{costCode.code}</TableCell>
                <TableCell>{costCode.description}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{COST_TYPE_LABELS[costCode.costType]}</Badge>
                </TableCell>
                <TableCell>{costCode.defaultUnit}</TableCell>
                <TableCell>
                  <ActiveToggle costCode={costCode} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditCostCodeDialog costCode={costCode} />
                    <DeleteCostCodeButton costCode={costCode} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
