import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { markAllNotificationsRead, markNotificationRead } from '../lib/firestoreService';
import type { AppNotification, UserRole } from '../types/campus';

interface Props {
  role: UserRole;
  uid: string;
}

export function NotificationBell({ role, uid }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!uid) return;

    const q =
      role === 'admin'
        ? query(collection(db, 'notifications'), where('recipientRole', '==', 'admin'))
        : query(
            collection(db, 'notifications'),
            where('recipientUid', '==', uid),
            where('recipientRole', '==', 'student')
          );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as AppNotification)
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
        setItems(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      }
    );

    return () => unsub();
  }, [role, uid]);

  const unreadIds = items.filter((n) => !n.isRead).map((n) => n.notificationId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadIds.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-md bg-blue-700 text-white text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
            {unreadIds.length > 9 ? '9+' : unreadIds.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
          <div className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-display font-bold text-slate-900">Notifications</h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {unreadIds.length} unread of {items.length} total
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead(unreadIds)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-700">No notifications yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {role === 'admin'
                      ? 'New student signups, applications, and safety reports will appear here.'
                      : 'Application status updates, deadlines, and campus events will appear here.'}
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const dateText = item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Just now';

                  return (
                    <div
                      key={item.notificationId}
                      className={`px-6 py-4 transition-colors ${
                        item.isRead ? 'bg-white' : 'bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 leading-snug">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {item.message}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 mt-2 tabular-nums">
                            {dateText}
                          </p>
                        </div>
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(item.notificationId)}
                            className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
