"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PROJECT_ALLOWED_TRANSITIONS } from "@pm4mep/domain";
import { Pencil } from "lucide-react";
import {
  ChangeOrderCreateSchema,
  CostTypeSchema,
  ProjectBudgetLineManualCreateSchema,
  ProjectCostEntryCreateSchema,
  ProjectMilestoneCreateSchema,
  ProjectUpdateSchema,
  type ChangeOrder,
  type ChangeOrderCreate,
  type ChangeOrderStatus,
  type CostCode,
  type ProjectBudgetLineManualCreate,
  type ProjectCostEntryCreate,
  type ProjectMilestoneCreate,
  type ProjectStatus,
  type ProjectWithDetails,
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
import { formatCurrency, formatCurrencyPrecise } from "@/lib/format";
import { STATUS_VARIANT } from "../projects-client";
import {
  addBudgetLine,
  addChangeOrder,
  addCostEntry,
  addMilestone,
  removeBudgetLine,
  removeCostEntry,
  removeMilestone,
  transitionChangeOrderStatus,
  transitionProjectStatus,
  updateMilestone,
  updateProject,
} from "../actions";

const COST_TYPE_LABELS: Record<string, string> = {
  labor: "Labor",
  material: "Material",
  equipment: "Equipment",
  subcontract: "Subcontract",
  other: "Other",
};

const CHANGE_ORDER_STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  Draft: "secondary",
  Pending: "default",
  Approved: "default",
  Rejected: "destructive",
};

const CHANGE_ORDER_NEXT_ACTIONS: Record<ChangeOrderStatus, { label: string; status: ChangeOrderStatus }[]> = {
  Draft: [{ label: "Submit for approval", status: "Pending" }],
  Pending: [
    { label: "Approve", status: "Approved" },
    { label: "Reject", status: "Rejected" },
  ],
  Approved: [{ label: "Reopen", status: "Draft" }],
  Rejected: [{ label: "Reopen", status: "Draft" }],
};

function StatusControls({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<ProjectStatus | null>(null);
  const nextStatuses = PROJECT_ALLOWED_TRANSITIONS[status];

  async function transition(next: ProjectStatus) {
    setPending(next);
    await transitionProjectStatus(projectId, next);
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

function SummaryCard({ project }: { project: ProjectWithDetails }) {
  const { rollup } = project;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs. actual</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {(["labor", "material", "equipment", "subcontract", "other"] as const).map((type) => (
          <div key={type} className="flex justify-between">
            <span className="text-muted-foreground">{COST_TYPE_LABELS[type]}</span>
            <span>
              {formatCurrency(rollup.actualByType[type] ?? 0)} / {formatCurrency(rollup.budgetByType[type] ?? 0)}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Total budget</span>
          <span>{formatCurrency(rollup.totalBudget)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total actual</span>
          <span>{formatCurrency(rollup.totalActualCost)}</span>
        </div>
        {project.contractValue != null && (
          <>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span>Contract value</span>
              <span>{formatCurrency(project.contractValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margin</span>
              <span className={project.contractValue - rollup.totalActualCost < 0 ? "text-destructive" : undefined}>
                {formatCurrency(project.contractValue - rollup.totalActualCost)}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Variance</span>
          <span className={rollup.totalVariance < 0 ? "text-destructive" : undefined}>
            {formatCurrency(rollup.totalVariance)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">% spent</span>
          <span>{rollup.percentSpent.toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CostCodeSelect({
  costCodes,
  value,
  onChange,
}: {
  costCodes: CostCode[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v || undefined)}>
      <SelectTrigger>
        <SelectValue placeholder="None">
          {(v: string) => costCodes.find((c) => c.id === v)?.code ?? "None"}
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
  );
}

function AddBudgetLineDialog({ projectId, costCodes }: { projectId: string; costCodes: CostCode[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectBudgetLineManualCreate>({
    resolver: zodResolver(ProjectBudgetLineManualCreateSchema),
    defaultValues: { description: "", costType: "material", budgetAmount: 0 },
  });

  async function submit(values: ProjectBudgetLineManualCreate) {
    setServerError(null);
    const result = await addBudgetLine(projectId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add budget line</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add budget line</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bl-description">Description</Label>
            <Input id="bl-description" {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Cost type</Label>
              <Select
                value={watch("costType")}
                onValueChange={(value) => value && setValue("costType", value as ProjectBudgetLineManualCreate["costType"])}
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
              <CostCodeSelect
                costCodes={costCodes}
                value={watch("costCodeId")}
                onChange={(value) => setValue("costCodeId", value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bl-amount">Budget amount ($)</Label>
            <Input id="bl-amount" type="number" step="0.01" {...register("budgetAmount", { valueAsNumber: true })} />
            {errors.budgetAmount && <p className="text-sm text-destructive">{errors.budgetAmount.message}</p>}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add budget line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogCostEntryDialog({ projectId, costCodes }: { projectId: string; costCodes: CostCode[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectCostEntryCreate>({
    resolver: zodResolver(ProjectCostEntryCreateSchema),
    defaultValues: {
      description: "",
      costType: "material",
      quantity: 1,
      unitCost: 0,
      incurredOn: new Date(),
    },
  });

  async function submit(values: ProjectCostEntryCreate) {
    setServerError(null);
    const result = await addCostEntry(projectId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Log cost</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log actual cost</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ce-description">Description</Label>
            <Input id="ce-description" {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Cost type</Label>
              <Select
                value={watch("costType")}
                onValueChange={(value) => value && setValue("costType", value as ProjectCostEntryCreate["costType"])}
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
              <CostCodeSelect
                costCodes={costCodes}
                value={watch("costCodeId")}
                onChange={(value) => setValue("costCodeId", value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ce-quantity">Quantity</Label>
              <Input id="ce-quantity" type="number" step="0.0001" {...register("quantity", { valueAsNumber: true })} />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ce-unitCost">Unit cost ($)</Label>
              <Input id="ce-unitCost" type="number" step="0.0001" {...register("unitCost", { valueAsNumber: true })} />
              {errors.unitCost && <p className="text-sm text-destructive">{errors.unitCost.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ce-incurredOn">Incurred on</Label>
              <Input id="ce-incurredOn" type="date" {...register("incurredOn")} />
              {errors.incurredOn && <p className="text-sm text-destructive">{errors.incurredOn.message}</p>}
            </div>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging…" : "Log cost"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetTab({ project, costCodes }: { project: ProjectWithDetails; costCodes: CostCode[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget lines</CardTitle>
          <AddBudgetLineDialog projectId={project.id} costCodes={costCodes} />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.budgetLines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No budget lines yet.
                    </TableCell>
                  </TableRow>
                )}
                {project.budgetLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{COST_TYPE_LABELS[line.costType]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {line.sourceEstimateLineItemId ? "Estimate" : "Manual"}
                    </TableCell>
                    <TableCell>{formatCurrency(line.budgetAmount)}</TableCell>
                    <TableCell>
                      <RemoveButton onRemove={() => removeBudgetLine(project.id, line.id).then(() => undefined)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Actual costs</CardTitle>
          <LogCostEntryDialog projectId={project.id} costCodes={costCodes} />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Extended</TableHead>
                  <TableHead>Entered by</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.costEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No costs logged yet.
                    </TableCell>
                  </TableRow>
                )}
                {project.costEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.incurredOn).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{COST_TYPE_LABELS[entry.costType]}</Badge>
                    </TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell>{formatCurrencyPrecise(entry.unitCost)}</TableCell>
                    <TableCell>{formatCurrency(entry.extendedCost)}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.enteredByName}</TableCell>
                    <TableCell>
                      <RemoveButton onRemove={() => removeCostEntry(project.id, entry.id).then(() => undefined)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddMilestoneDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectMilestoneCreate>({
    resolver: zodResolver(ProjectMilestoneCreateSchema),
    defaultValues: { name: "" },
  });

  async function submit(values: ProjectMilestoneCreate) {
    setServerError(null);
    const result = await addMilestone(projectId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add milestone</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add milestone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ms-name">Milestone name</Label>
            <Input id="ms-name" placeholder="Rough-in complete" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ms-dueDate">Due date</Label>
            <Input id="ms-dueDate" type="date" {...register("dueDate")} />
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MilestoneRow({ projectId, milestone }: { projectId: string; milestone: ProjectWithDetails["milestones"][number] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggleComplete() {
    setPending(true);
    await updateMilestone(projectId, milestone.id, {
      completedAt: milestone.completedAt ? null : new Date(),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{milestone.name}</TableCell>
      <TableCell>{milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "—"}</TableCell>
      <TableCell>
        <Badge variant={milestone.completedAt ? "default" : "secondary"}>
          {milestone.completedAt ? "Complete" : "Open"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={toggleComplete} disabled={pending}>
            {milestone.completedAt ? "Reopen" : "Mark complete"}
          </Button>
          <RemoveButton onRemove={() => removeMilestone(projectId, milestone.id).then(() => undefined)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function ScheduleTab({ project }: { project: ProjectWithDetails }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Milestones</CardTitle>
        <AddMilestoneDialog projectId={project.id} />
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.milestones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No milestones yet.
                  </TableCell>
                </TableRow>
              )}
              {project.milestones.map((milestone) => (
                <MilestoneRow key={milestone.id} projectId={project.id} milestone={milestone} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function AddChangeOrderDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeOrderCreate>({
    resolver: zodResolver(ChangeOrderCreateSchema),
    defaultValues: { title: "", amount: 0 },
  });

  async function submit(values: ChangeOrderCreate) {
    setServerError(null);
    const result = await addChangeOrder(projectId, values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">New change order</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New change order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="co-title">Title</Label>
            <Input id="co-title" placeholder="Additional ductwork — 2nd floor" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="co-description">Description (optional)</Label>
            <Input id="co-description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-amount">Budget amount ($)</Label>
              <Input id="co-amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-scheduleImpactDays">Schedule impact (days, optional)</Label>
              <Input
                id="co-scheduleImpactDays"
                type="number"
                step="1"
                {...register("scheduleImpactDays", { valueAsNumber: true })}
              />
            </div>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create change order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeOrderRow({ projectId, changeOrder }: { projectId: string; changeOrder: ChangeOrder }) {
  const router = useRouter();
  const [pending, setPending] = useState<ChangeOrderStatus | null>(null);

  async function transition(next: ChangeOrderStatus) {
    setPending(next);
    await transitionChangeOrderStatus(projectId, changeOrder.id, next);
    setPending(null);
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{changeOrder.title}</TableCell>
      <TableCell>
        <Badge variant={CHANGE_ORDER_STATUS_VARIANT[changeOrder.status]}>{changeOrder.status}</Badge>
      </TableCell>
      <TableCell className={changeOrder.amount < 0 ? "text-destructive" : undefined}>
        {changeOrder.amount >= 0 ? "+" : ""}
        {formatCurrency(changeOrder.amount)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {changeOrder.scheduleImpactDays ? `${changeOrder.scheduleImpactDays}d` : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {CHANGE_ORDER_NEXT_ACTIONS[changeOrder.status].map((action) => (
            <Button
              key={action.status}
              variant="outline"
              size="sm"
              disabled={pending !== null}
              onClick={() => transition(action.status)}
            >
              {pending === action.status ? "…" : action.label}
            </Button>
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ChangeOrdersTab({ project }: { project: ProjectWithDetails }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Change orders</CardTitle>
        <AddChangeOrderDialog projectId={project.id} />
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Schedule impact</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.changeOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No change orders yet.
                  </TableCell>
                </TableRow>
              )}
              {project.changeOrders.map((changeOrder) => (
                <ChangeOrderRow key={changeOrder.id} projectId={project.id} changeOrder={changeOrder} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EditProjectNameDialog({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({
    resolver: zodResolver(ProjectUpdateSchema.pick({ name: true }).required()),
    defaultValues: { name },
  });

  async function submit(values: { name: string }) {
    setServerError(null);
    const result = await updateProject(projectId, values);
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
          <Button variant="ghost" size="icon" aria-label="Edit project name">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project name</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" {...register("name")} />
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

export function ProjectDetailClient({
  project,
  costCodes,
}: {
  project: ProjectWithDetails;
  costCodes: CostCode[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.number} — {project.name}
            </h1>
            <EditProjectNameDialog projectId={project.id} name={project.name} />
          </div>
          <p className="text-muted-foreground">
            {project.customerName}
            {project.projectManagerName ? ` · PM: ${project.projectManagerName}` : ""}
          </p>
        </div>
        <StatusControls projectId={project.id} status={project.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="budget">
            <TabsList>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="change-orders">Change orders</TabsTrigger>
            </TabsList>
            <TabsContent value="budget">
              <BudgetTab project={project} costCodes={costCodes} />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleTab project={project} />
            </TabsContent>
            <TabsContent value="change-orders">
              <ChangeOrdersTab project={project} />
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <SummaryCard project={project} />
        </div>
      </div>
    </div>
  );
}
