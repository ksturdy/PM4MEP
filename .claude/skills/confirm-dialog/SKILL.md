---
name: confirm-dialog
description: Use whenever adding a destructive or consequential action (delete, remove, revoke, send-to-others) to apps/web — confirming via the app's branded, centered dialog instead of the browser's native window.confirm popup. Triggers on "delete button", "remove button", "are you sure", "confirmation prompt", "destructive action".
---

# Branded confirm dialog (apps/web)

`window.confirm()` renders the browser's native, unstyled popup — it doesn't
match the app's design system and (in Chrome) anchors near the top of the
viewport instead of the center. Use the app's own centered, brand-styled
confirm dialog instead.

## Usage

```tsx
import { useConfirm } from "@/components/ui/confirm-dialog";

function DeleteThingButton({ thing }: { thing: Thing }) {
  const confirm = useConfirm();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const confirmed = await confirm({
      title: `Delete ${thing.name}?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
      // destructive defaults to true — red confirm button + warning icon.
      // Pass destructive: false for non-destructive confirmations (e.g.
      // "send this email?") to get the default (non-red) button instead.
    });
    if (!confirmed) return;
    setPending(true);
    const result = await deleteThing(thing.id);
    setPending(false);
    if (!result.ok) {
      window.alert(result.error); // error surfacing still uses window.alert — no toast system exists yet
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
```

- `useConfirm()` returns `(options) => Promise<boolean>` — same call-site
  ergonomics as `window.confirm`, but resolves via the app's own `Dialog`
  primitive (already centered, already themed).
- `ConfirmDialogProvider` is mounted once in
  [apps/web/src/app/layout.tsx](../../../apps/web/src/app/layout.tsx) — no
  per-page setup needed, just import the hook.
- Source: [apps/web/src/components/ui/confirm-dialog.tsx](../../../apps/web/src/components/ui/confirm-dialog.tsx).

## Do not

- Do not reach for `window.confirm` in new code under `apps/web` — use this
  hook instead.
- Do not build a one-off `Dialog` for a plain yes/no confirmation — this hook
  already covers that case app-wide.
