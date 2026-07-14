"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  EstimateCreateSchema,
  type Customer,
  type EstimateCreate,
  type EstimateListItem,
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
import { createEstimate } from "./actions";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  Draft: "secondary",
  Submitted: "default",
  Won: "default",
  Lost: "destructive",
};

function NewEstimateDialog({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EstimateCreate>({
    resolver: zodResolver(EstimateCreateSchema),
    defaultValues: { customerId: customers[0]?.id ?? "", name: "" },
  });

  async function submit(values: EstimateCreate) {
    setServerError(null);
    const result = await createEstimate(values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.push(`/estimating/estimates/${result.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New estimate</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New estimate</DialogTitle>
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
            <Label htmlFor="name">Estimate name</Label>
            <Input id="name" placeholder="123 Main St — RTU Replacement" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EstimatesClient({
  estimates,
  customers,
}: {
  estimates: EstimateListItem[];
  customers: Customer[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewEstimateDialog customers={customers} />
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sell price</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No estimates yet.
                </TableCell>
              </TableRow>
            )}
            {estimates.map((estimate) => (
              <TableRow key={estimate.id}>
                <TableCell className="font-medium">{estimate.number}</TableCell>
                <TableCell>{estimate.name}</TableCell>
                <TableCell>{estimate.customerName}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[estimate.status]}>{estimate.status}</Badge>
                </TableCell>
                <TableCell>
                  ${(estimate.finalSellPriceOverride ?? estimate.calculatedSellPrice).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/estimating/estimates/${estimate.id}`}>Open</Link>}
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
