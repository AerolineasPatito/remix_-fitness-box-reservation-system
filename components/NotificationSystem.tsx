import React, { createContext, useContext, useMemo, useState } from 'react';
import { Toast } from './ui/Toast.tsx';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  details?: Record<string, any>;
  suggestions?: string[];
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'> & { id?: string }) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addNotification = (notification: Omit<Notification, 'id'> & { id?: string }) => {
    const id = notification.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const cleanNotification: Notification = {
      ...notification,
      id,
      details: notification.details
        ? Object.fromEntries(
            Object.entries(notification.details).filter(
              ([key, value]) =>
                !['duration', 'id', 'actions', 'suggestions'].includes(key) &&
                value !== undefined &&
                value !== null &&
                value !== ''
            )
          )
        : undefined
    };

    setNotifications((prev) => [...prev, cleanNotification]);
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      window.setTimeout(() => removeNotification(id), duration);
    }
  };

  const clearAll = () => setNotifications([]);

  const value = useMemo(
    () => ({ notifications, addNotification, removeNotification, clearAll }),
    [notifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => setIsVisible(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    window.setTimeout(onRemove, 220);
  };

  return (
    <div
      className={`
        relative
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
      `}
    >
      <Toast
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
        suggestions={notification.suggestions}
        actions={notification.actions}
        onClose={handleClose}
      />
    </div>
  );
};
