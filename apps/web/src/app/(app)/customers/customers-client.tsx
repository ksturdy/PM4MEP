"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CustomerCreateSchema, type Customer, type CustomerCreate } from "@pm4mep/shared-schema";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCustomer, updateCustomer } from "./actions";

function CustomerForm({
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  defaultValues?: CustomerCreate;
  onSubmit: (values: CustomerCreate) => Promise<{ ok: boolean; error?: string }>;
  onSuccess: () => void;
  submitLabel: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreate>({
    resolver: zodResolver(CustomerCreateSchema),
    defaultValues: defaultValues ?? {
      name: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
    },
  });

  async function submit(values: CustomerCreate) {
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
        <Label htmlFor="name">Company name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="addressLine1">Address</Label>
        <Input id="addressLine1" placeholder="Address line 1" {...register("addressLine1")} />
        {errors.addressLine1 && <p className="text-sm text-destructive">{errors.addressLine1.message}</p>}
        <Input id="addressLine2" placeholder="Address line 2 (optional)" {...register("addressLine2")} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} />
          {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="postalCode">ZIP</Label>
          <Input id="postalCode" {...register("postalCode")} />
          {errors.postalCode && <p className="text-sm text-destructive">{errors.postalCode.message}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="primaryContactName">Primary contact</Label>
        <Input id="primaryContactName" placeholder="Name" {...register("primaryContactName")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="primaryContactEmail">Contact email</Label>
          <Input id="primaryContactEmail" type="email" {...register("primaryContactEmail")} />
          {errors.primaryContactEmail && (
            <p className="text-sm text-destructive">{errors.primaryContactEmail.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="primaryContactPhone">Contact phone</Label>
          <Input id="primaryContactPhone" {...register("primaryContactPhone")} />
        </div>
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

function AddCustomerDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add customer</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <CustomerForm
          submitLabel="Add customer"
          onSubmit={async (values) => createCustomer(values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditCustomerDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
        </DialogHeader>
        <CustomerForm
          defaultValues={{
            name: customer.name,
            addressLine1: customer.addressLine1,
            addressLine2: customer.addressLine2 ?? undefined,
            city: customer.city,
            state: customer.state,
            postalCode: customer.postalCode,
            primaryContactName: customer.primaryContactName ?? undefined,
            primaryContactEmail: customer.primaryContactEmail ?? undefined,
            primaryContactPhone: customer.primaryContactPhone ?? undefined,
          }}
          submitLabel="Save changes"
          onSubmit={async (values) => updateCustomer(customer.id, values)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ActiveToggle({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await updateCustomer(customer.id, { active: !customer.active });
    setPending(false);
    router.refresh();
  }

  return <Switch checked={customer.active} disabled={pending} onCheckedChange={toggle} />;
}

export function CustomersClient({ customers }: { customers: Customer[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddCustomerDialog />
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Primary contact</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>
                  {customer.city}, {customer.state}
                </TableCell>
                <TableCell>{customer.primaryContactName || "—"}</TableCell>
                <TableCell>
                  <ActiveToggle customer={customer} />
                </TableCell>
                <TableCell>
                  <EditCustomerDialog customer={customer} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
