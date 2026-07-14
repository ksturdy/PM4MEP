"use client";

import { ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  LOGO_CONTENT_TYPES,
  OrganizationUpdateSchema,
  type LogoUploadUrlRequest,
  type OrganizationDetail,
  type OrganizationUpdate,
} from "@pm4mep/shared-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLogoUploadUrl, updateOrganization } from "./actions";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function LogoUpload({
  orgName,
  logoUrl,
  onUploaded,
}: {
  orgName: string;
  logoUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!(LOGO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setError("Logo must be a PNG or JPEG image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be smaller than 2MB.");
      return;
    }

    setUploading(true);
    const urlResult = await getLogoUploadUrl({ contentType: file.type as LogoUploadUrlRequest["contentType"] });
    if (!urlResult.ok) {
      setError(urlResult.error);
      setUploading(false);
      return;
    }

    // Direct browser → R2 PUT, not through our own servers — the presigned
    // URL is the credential, so this can't go through a Server Action
    // (there'd be nothing for it to usefully do with the raw file bytes).
    const putRes = await fetch(urlResult.data.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!putRes.ok) {
      setError("Upload failed — try again.");
      setUploading(false);
      return;
    }

    const saveResult = await updateOrganization({ name: orgName, logoUrl: urlResult.data.publicUrl });
    setUploading(false);
    if (!saveResult.ok) {
      setError(saveResult.error);
      return;
    }
    onUploaded(urlResult.data.publicUrl);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Logo</Label>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Company logo" className="h-16 w-auto rounded border border-border object-contain p-1" />
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
            No logo
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Input type="file" accept="image/png,image/jpeg" disabled={uploading} onChange={handleChange} className="max-w-xs" />
          <p className="text-xs text-muted-foreground">PNG or JPEG, up to 2MB.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function CompanyClient({ organization, canEdit }: { organization: OrganizationDetail; canEdit: boolean }) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationUpdate>({
    resolver: zodResolver(OrganizationUpdateSchema),
    defaultValues: {
      name: organization.name,
      addressLine1: organization.addressLine1 ?? undefined,
      addressLine2: organization.addressLine2 ?? undefined,
      city: organization.city ?? undefined,
      state: organization.state ?? undefined,
      postalCode: organization.postalCode ?? undefined,
      phone: organization.phone ?? undefined,
      email: organization.email ?? undefined,
      licenseNumber: organization.licenseNumber ?? undefined,
    },
  });

  async function submit(values: OrganizationUpdate) {
    setServerError(null);
    const result = await updateOrganization(values);
    if (!result.ok) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company information</CardTitle>
        <CardDescription>Shown on proposal letterhead sent to customers.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {canEdit ? (
          <LogoUpload orgName={getValues("name") || organization.name} logoUrl={logoUrl} onUploaded={setLogoUrl} />
        ) : (
          logoUrl && (
              <img src={logoUrl} alt="Company logo" className="h-16 w-auto rounded border border-border object-contain p-1" />
          )
        )}

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <fieldset disabled={!canEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input id="addressLine1" placeholder="Address line 1" {...register("addressLine1")} />
              <Input id="addressLine2" placeholder="Address line 2 (optional)" {...register("addressLine2")} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register("city")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register("state")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="postalCode">ZIP</Label>
                <Input id="postalCode" {...register("postalCode")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="licenseNumber">License number</Label>
              <Input id="licenseNumber" {...register("licenseNumber")} />
            </div>
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
