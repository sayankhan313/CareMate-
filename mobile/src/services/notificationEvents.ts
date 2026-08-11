type NotificationChangedListener = () => void;

const listeners = new Set<NotificationChangedListener>();

export const notificationEvents = {
  emitChanged() {
    listeners.forEach(listener => listener());
  },

  subscribe(listener: NotificationChangedListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
