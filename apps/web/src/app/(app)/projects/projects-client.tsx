"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  ProjectCreateSchema,
  type Customer,
  type ProjectCreate,
  type ProjectListItem,
} from "@pm4mep/shared-schema";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { createProject } from "./actions";

export const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  Planning: "secondary",
  Active: "default",
  OnHold: "secondary",
  Complete: "default",
  Cancelled: "destructive",
};

function NewProjectDialog({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectCreate>({
    resolver: zodResolver(ProjectCreateSchema),
    defaultValues: { customerId: customers[0]?.id ?? "", name: "" },
  });

  async function submit(values: ProjectCreate) {
    setServerError(null);
    const result = await createProject(values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.push(`/projects/${result.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New project</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Customer</Label>
            <Select
              value={watch("customerId") ?? ""}
              onValueChange={(value) => value && setValue("customerId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer">
                  {(value: string) => customers.find((c) => c.id === value)?.name ?? "Select a customer"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId && <p className="text-sm text-destructive">{errors.customerId.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" placeholder="123 Main St — RTU Replacement" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="targetCompletionDate">Target completion</Label>
              <Input id="targetCompletionDate" type="date" {...register("targetCompletionDate")} />
            </div>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectsClient({
  projects,
  customers,
}: {
  projects: ProjectListItem[];
  customers: Customer[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewProjectDialog customers={customers} />
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PM</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No projects yet — convert a Won estimate or create one from scratch.
                </TableCell>
              </TableRow>
            )}
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.number}</TableCell>
                <TableCell>{project.name}</TableCell>
                <TableCell>{project.customerName}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[project.status]}>{project.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{project.projectManagerName ?? "—"}</TableCell>
                <TableCell>{formatCurrency(project.totalBudget)}</TableCell>
                <TableCell
                  className={project.totalActualCost > project.totalBudget ? "text-destructive" : undefined}
                >
                  {formatCurrency(project.totalActualCost)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/projects/${project.id}`}>Open</Link>}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
