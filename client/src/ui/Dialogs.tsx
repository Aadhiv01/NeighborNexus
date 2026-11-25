import type { ReactNode } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "./Button";

const backdrop = "fixed inset-0 z-[150] bg-ink/40 backdrop-blur-[2px] transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";
const popup =
  "fixed left-1/2 top-1/2 z-[160] max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-card border border-line bg-surface p-6 text-ink shadow-2xl outline-none transition-[opacity,transform] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0";

/** Focus-trapped confirmation with an explicit destructive action. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, cancelLabel = "Keep it", danger = true, loading, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={backdrop} />
        <AlertDialog.Popup className={popup}>
          <AlertDialog.Title className="m-0 font-display text-2xl font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mb-0 mt-2 text-ink-soft">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Close className="inline-flex items-center justify-center rounded-ui border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              {cancelLabel}
            </AlertDialog.Close>
            <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** A modal that holds a form. */
export function FormDialog({
  open, onOpenChange, title, description, children, wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdrop} />
        <Dialog.Popup className={wide ? popup.replace("w-[min(32rem,calc(100vw-2rem))]", "w-[min(44rem,calc(100vw-2rem))]") : popup}>
          <Dialog.Title className="m-0 font-display text-2xl font-semibold">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="mb-0 mt-1 text-ink-soft">{description}</Dialog.Description>
          )}
          <div className="mt-5">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
