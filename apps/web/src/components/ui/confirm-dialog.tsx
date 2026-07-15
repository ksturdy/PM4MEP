"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button and title icon as a destructive action. Defaults to true. */
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

const ConfirmContext = React.createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ destructive: true, ...options, resolve });
    });
  }, []);

  function settle(confirmed: boolean) {
    state?.resolve(confirmed);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state !== null} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {state?.destructive && <TriangleAlert className="size-5 shrink-0 text-destructive" />}
              <DialogTitle>{state?.title}</DialogTitle>
            </div>
            {state?.description && <DialogDescription>{state.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => settle(false)}>
              {state?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={state?.destructive ? "destructive" : "default"} onClick={() => settle(true)}>
              {state?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/** Returns a function that opens the app's branded confirm dialog and resolves to whether the user confirmed — an async, centered replacement for `window.confirm`. */
export function useConfirm() {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return confirm;
}
