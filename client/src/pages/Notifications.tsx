import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, qk } from "../lib/api";
import { useNotifications } from "../lib/useNotifications";
import type { AppNotification, NotificationType } from "../lib/types";
import Page from "../layout/Page";
import { PageHeader } from "../ui/Display";
import { Button } from "../ui/Button";
import { EmptyState, Skeleton } from "../ui/Feedback";
import { BoltIcon, CalendarIcon, CheckIcon, XIcon } from "../ui/Icons";

const ICONS: Record<NotificationType, typeof BoltIcon> = {
  booking_created: CalendarIcon,
  booking_rescheduled: CalendarIcon,
  booking_canceled: XIcon,
  booking_completed: CheckIcon,
  reminder: BoltIcon,
};

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
function ago(iso: string) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending } = useNotifications();
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.notifications });
  const markAll = useMutation({ mutationFn: api.markAllRead, onSuccess: refresh });
  const markOne = useMutation({ mutationFn: (id: string) => api.markRead(id), onSuccess: refresh });

  const open = (n: AppNotification) => {
    if (!n.readAt) markOne.mutate(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <Page title="Updates">
      <PageHeader
        eyebrow="Updates"
        title="Your updates"
        subtitle={unread ? `${unread} unread.` : "You’re all caught up."}
        actions={<Button variant="secondary" disabled={!unread} loading={markAll.isPending} onClick={() => markAll.mutate()}>Mark all as read</Button>}
      />

      {isPending && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}</div>}

      {!isPending && items.length === 0 && (
        <EmptyState title="Nothing yet">
          New bookings, changes and reminders will show up here, and we’ll email you too when email is set up.
        </EmptyState>
      )}

      <ul className="m-0 grid list-none gap-3 p-0">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? BoltIcon;
          return (
            <li key={n._id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={`flex w-full items-start gap-4 rounded-card border p-5 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  n.readAt ? "border-line bg-surface" : "border-accent bg-accent-soft"
                }`}
              >
                <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-ui ${n.readAt ? "bg-surface-2 text-ink-soft" : "bg-accent text-accent-ink"}`}>
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {!n.readAt && <span className="sr-only">Unread: </span>}
                    {n.title}
                  </span>
                  <span className="block text-ink-soft">{n.body}</span>
                </span>
                <span className="shrink-0 text-sm text-ink-soft">{ago(n.createdAt)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
