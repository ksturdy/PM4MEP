"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  InvitationCreateSchema,
  RoleSchema,
  type Invitation,
  type InvitationCreate,
  type Role,
  type TeamMember,
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
import { inviteMember, removeMember, resetMemberPassword, revokeInvitation, updateMemberRole } from "./actions";

function formatLastLogin(lastLoginAt: Date | null): string {
  if (!lastLoginAt) return "Never";
  return lastLoginAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const ROLE_LABELS: Record<Role, string> = {
  Owner: "Owner",
  Admin: "Admin",
  Estimator: "Estimator",
  ProjectManager: "Project Manager",
  Field: "Field",
  Accounting: "Accounting",
};

function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitationCreate>({
    resolver: zodResolver(InvitationCreateSchema),
    defaultValues: { email: "", role: "Estimator" },
  });

  async function submit(values: InvitationCreate) {
    setServerError(null);
    const result = await inviteMember(values);
    if (!result.ok) {
      setServerError(result.error ?? "Failed to send invite");
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger render={<Button>Invite member</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={watch("role")} onValueChange={(value) => setValue("role", value as Role)}>
              <SelectTrigger>
                <SelectValue>{(value: string) => ROLE_LABELS[value as Role] ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {RoleSchema.options.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberRoleCell({ member, disabled }: { member: TeamMember; disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (disabled) {
    return <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>;
  }

  async function handleChange(role: string | null) {
    if (!role) return;
    setPending(true);
    await updateMemberRole(member.id, role as Role);
    setPending(false);
    router.refresh();
  }

  return (
    <Select value={member.role} disabled={pending} onValueChange={handleChange}>
      <SelectTrigger className="w-40">
        <SelectValue>{(value: string) => ROLE_LABELS[value as Role] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {RoleSchema.options.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RemoveMemberButton({ member }: { member: TeamMember }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Remove ${member.user.name} from your team?`)) return;
    setPending(true);
    const result = await removeMember(member.id);
    setPending(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleClick}>
      Remove
    </Button>
  );
}

function ResetPasswordButton({ member }: { member: TeamMember }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Send a password reset email to ${member.user.email}?`)) return;
    setPending(true);
    const result = await resetMemberPassword(member.id);
    setPending(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <span className="text-xs text-muted-foreground">Reset email sent</span>;
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleClick}>
      Reset password
    </Button>
  );
}

function RevokeInvitationButton({ invitation }: { invitation: Invitation }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Revoke the invite sent to ${invitation.email}?`)) return;
    setPending(true);
    await revokeInvitation(invitation.id);
    setPending(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleClick}>
      Revoke
    </Button>
  );
}

export function TeamClient({
  members,
  invitations,
  canManage,
}: {
  members: TeamMember[];
  invitations: Invitation[];
  canManage: boolean;
}) {
  const ownerCount = members.filter((m) => m.role === "Owner").length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Members</h2>
          {canManage && <InviteMemberDialog />}
        </div>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last login</TableHead>
                {canManage && <TableHead className="w-px" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                // Server enforces this too (see TeamService's last-owner
                // checks) — disabling here is convenience, not the boundary.
                const isLastOwner = member.role === "Owner" && ownerCount <= 1;
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.user.name}</TableCell>
                    <TableCell>{member.user.email}</TableCell>
                    <TableCell>
                      <MemberRoleCell member={member} disabled={!canManage || isLastOwner} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatLastLogin(member.user.lastLoginAt)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ResetPasswordButton member={member} />
                          {!isLastOwner && <RemoveMemberButton member={member} />}
                          {isLastOwner && (
                            <span
                              className="px-2 text-xs text-muted-foreground"
                              title="Every org needs at least one Owner"
                            >
                              Last Owner
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {canManage && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Pending invitations</h2>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No pending invitations.
                    </TableCell>
                  </TableRow>
                )}
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[invitation.role]}</Badge>
                    </TableCell>
                    <TableCell>{invitation.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <RevokeInvitationButton invitation={invitation} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
