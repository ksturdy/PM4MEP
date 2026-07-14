"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AssemblyCreateSchema, type AssemblyCreate } from "@pm4mep/shared-schema";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createAssembly } from "./actions";

export interface AssemblyListRow {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  active: boolean;
  _count: { components: number };
}

function AddAssemblyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssemblyCreate>({
    resolver: zodResolver(AssemblyCreateSchema),
    defaultValues: { name: "", unit: "" },
  });

  async function submit(values: AssemblyCreate) {
    setServerError(null);
    const result = await createAssembly(values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.push(`/estimating/assemblies/${result.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add assembly</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add assembly</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="3-Ton RTU Install" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="EA, TON…" {...register("unit")} />
              {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="Optional" {...register("category")} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Optional" {...register("description")} />
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create & add components"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssembliesClient({ assemblies }: { assemblies: AssemblyListRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddAssemblyDialog />
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Components</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assemblies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No assemblies yet.
                </TableCell>
              </TableRow>
            )}
            {assemblies.map((assembly) => (
              <TableRow key={assembly.id}>
                <TableCell className="font-medium">{assembly.name}</TableCell>
                <TableCell>{assembly.category || "—"}</TableCell>
                <TableCell>{assembly.unit}</TableCell>
                <TableCell>{assembly._count.components}</TableCell>
                <TableCell>{assembly.active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/estimating/assemblies/${assembly.id}`}>View</Link>}
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
