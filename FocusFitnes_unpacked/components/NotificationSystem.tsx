import React, { createContext, useContext, useMemo, useState } from 'react';

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

  const config =
    notification.type === 'success'
      ? { bg: 'from-emerald-500 to-emerald-600', icon: 'fa-check-circle', iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-200' }
      : notification.type === 'error'
        ? { bg: 'from-rose-500 to-rose-600', icon: 'fa-triangle-exclamation', iconBg: 'bg-rose-100 text-rose-600', border: 'border-rose-200' }
        : notification.type === 'warning'
          ? { bg: 'from-amber-500 to-amber-600', icon: 'fa-circle-exclamation', iconBg: 'bg-amber-100 text-amber-600', border: 'border-amber-200' }
          : { bg: 'from-brand to-cyan-600', icon: 'fa-circle-info', iconBg: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-200' };

  const detailsEntries = Object.entries(notification.details || {});

  return (
    <div
      className={`
        relative bg-white rounded-2xl shadow-2xl border-2 ${config.border}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
      `}
    >
      <div className={`bg-gradient-to-r ${config.bg} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg}`}>
              <i className={`fas ${config.icon}`}></i>
            </div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">{notification.title}</h3>
          </div>
          <button onClick={handleClose} className="text-white/85 hover:text-white p-1">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-zinc-700 text-sm leading-relaxed">{notification.message}</p>

        {detailsEntries.length > 0 && (
          <div className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <h4 className="font-black text-xs text-zinc-600 uppercase tracking-wider">Detalles</h4>
            {detailsEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs gap-3">
                <span className="text-zinc-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="font-bold text-zinc-900 text-right">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {notification.suggestions && notification.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-black text-xs text-zinc-600 uppercase tracking-wider">Sugerencias</h4>
            <ul className="space-y-1">
              {notification.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-xs text-zinc-600 flex items-start gap-2">
                  <i className="fas fa-lightbulb text-amber-500 mt-0.5"></i>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 pt-1">
            {notification.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  action.variant === 'primary'
                    ? 'bg-brand text-white hover:bg-cyan-600'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

