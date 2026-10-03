import { useState, useMemo } from 'react';

/**
 * Custom hook for managing application notifications and reminders.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
  };

  return {
    notifications,
    unreadNotificationCount,
    markAsRead,
    markAllAsRead,
  };
}
