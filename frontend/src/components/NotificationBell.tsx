import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../lib/api';

// ui-ux-flow.md §0.2: notification bell with unread count, consistent across all four dashboards.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list(true),
    refetchInterval: 30_000,
  });

  const { data: all, isLoading } = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: () => notificationsApi.list(false),
    enabled: open,
  });

  const unreadCount = unread?.length ?? 0;

  async function handleMarkRead(notificationId: string) {
    await notificationsApi.markRead(notificationId);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 max-h-96 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Notifications</div>
            {isLoading && <div className="px-3 py-4 text-sm text-slate-500">Loading…</div>}
            {all && all.length === 0 && <div className="px-3 py-4 text-sm text-slate-500">No notifications yet.</div>}
            {all?.map((item) => (
              <button
                key={item.notificationId}
                type="button"
                onClick={() => handleMarkRead(item.notificationId)}
                className={`block w-full border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  item.readAt ? 'text-slate-500' : 'font-medium text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{item.notification.title}</span>
                  {!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                </div>
                {item.notification.body && <div className="mt-0.5 text-xs text-slate-400">{item.notification.body}</div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
