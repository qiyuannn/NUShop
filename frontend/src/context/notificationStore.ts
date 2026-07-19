import { create } from "zustand";

export type NotificationItem = {
  id: string;
  type: "price_drop" | "message" | "cart_deleted";
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
};

type NotificationStore = {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, "id" | "read" | "createdAt">) => void;
  markAllRead: () => void;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newItem: NotificationItem = {
      id: crypto.randomUUID(),
      read: false,
      createdAt: Date.now(),
      ...notification,
    };

    set((state) => {
      const notifications = [newItem, ...state.notifications];
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    });
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));