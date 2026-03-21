import React, { useState, useEffect, createContext, useContext } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  details?: any;
  suggestions?: string[];
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = (id: string) => {
    console.log('Removing notification with ID:', id);
    console.log('Current notifications before removal:', notifications.map(n => n.id));
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      console.log('Notifications after removal:', filtered.map(n => n.id));
      return filtered;
    });
  };

  const addNotification = (notification: Omit<Notification, 'id'> & { id?: string }) => {
    // Use provided ID or generate a new one
    const id = notification.id || Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    console.log('addNotification called with ID:', id);
    
    // Clean notification object - remove system properties from details
    const cleanNotification = {
      ...notification,
      id,
      // Ensure duration is not in details
      details: notification.details ? Object.fromEntries(
        Object.entries(notification.details).filter(([key]) => 
          key !== 'duration' && key !== 'id' && key !== 'actions' && key !== 'suggestions'
        )
      ) : undefined
    };
    
    console.log('Creating notification:', cleanNotification);
    setNotifications(prev => [...prev, cleanNotification]);
    
    // Auto-remove after duration (default 5 seconds)
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
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
          onClose={() => removeNotification(notification.id)}
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
  const [progress, setProgress] = useState(100);

  // Debug complete notification object
  console.log('=== NOTIFICATION ITEM DEBUG ===');
  console.log('Complete notification object:', notification);
  console.log('Notification type:', notification.type);
  console.log('Notification title:', notification.title);
  console.log('Notification message:', notification.message);
  console.log('Notification details:', notification.details);
  console.log('Notification duration:', notification.duration);
  console.log('Notification actions:', notification.actions);
  console.log('================================');

  useEffect(() => {
    // Entrance animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(), 300);
  };

  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
          border: 'border-emerald-200',
          icon: 'fa-check-circle',
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          titleColor: 'text-emerald-900'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-rose-500 to-rose-600',
          border: 'border-rose-200',
          icon: 'fa-exclamation-triangle',
          iconBg: 'bg-rose-100',
          iconColor: 'text-rose-600',
          titleColor: 'text-rose-900'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
          border: 'border-amber-200',
          icon: 'fa-exclamation-circle',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          titleColor: 'text-amber-900'
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-brand to-cyan-600',
          border: 'border-cyan-200',
          icon: 'fa-info-circle',
          iconBg: 'bg-cyan-100',
          iconColor: 'text-cyan-600',
          titleColor: 'text-cyan-900'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-zinc-500 to-zinc-600',
          border: 'border-zinc-200',
          icon: 'fa-info-circle',
          iconBg: 'bg-zinc-100',
          iconColor: 'text-zinc-600',
          titleColor: 'text-zinc-900'
        };
    }
  };

  const config = getNotificationConfig(notification.type);

  return (
    <div
      className={`
        relative bg-white rounded-2xl shadow-2xl border-2 ${config.border}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        ${isLeaving ? 'translate-x-full opacity-0 scale-95' : ''}
        overflow-hidden
      `}
    >
      {/* Header with gradient */}
      <div className={`${config.bg} p-4 relative overflow-hidden`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center`}>
              <i className={`fas ${config.icon} ${config.iconColor}`}></i>
            </div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              {notification.title}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-zinc-700 text-sm leading-relaxed">
          {notification.message}
        </p>

        {/* Details section */}
        {notification.details && Object.keys(notification.details).length > 0 && (
          <div className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <h4 className="font-black text-xs text-zinc-600 uppercase tracking-wider">Detalles:</h4>
            
            {/* Debug: Show all details keys and values */}
            {console.log('NOTIFICATION DEBUG - All details:', notification.details)}
            {console.log('NOTIFICATION DEBUG - Details entries:', Object.entries(notification.details))}
            {console.log('NOTIFICATION DEBUG - Details keys:', Object.keys(notification.details))}
            
            {/* Specific details for reservations */}
            {notification.details.reservationCount !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">Reservas activas:</span>
                <span className="font-bold text-zinc-900">{notification.details.reservationCount}</span>
              </div>
            )}
            
            {notification.details.recentReservations && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-600">Reservas recientes:</p>
                {notification.details.recentReservations.map((res: any, idx: number) => (
                  <div key={idx} className="text-xs text-zinc-500 bg-white rounded-lg p-2">
                    <span className="font-medium">{res.type}</span> - {res.date} {res.start_time}
                  </div>
                ))}
              </div>
            )}
            
            {/* Generic details - show all key-value pairs */}
            {Object.entries(notification.details)
              .filter(([key, value]) => {
                console.log('FILTERING:', key, value, typeof value);
                
                // Skip system keys
                const skipKeys = ['reservationCount', 'recentReservations', 'duration', 'id', 'actions', 'suggestions', 'type', 'message', 'title'];
                if (skipKeys.includes(key)) {
                  console.log('SKIP - system key:', key);
                  return false;
                }
                
                // Skip falsy values
                if (!value || value === 0 || value === false || value === null || value === undefined) {
                  console.log('SKIP - falsy value:', key, value);
                  return false;
                }
                
                // Skip string "0"
                const valueStr = String(value);
                if (valueStr === '0') {
                  console.log('SKIP - string "0":', key, value);
                  return false;
                }
                
                console.log('PASS - will render:', key, value);
                return true;
              })
              .map(([key, value]) => {
                const valueStr = String(value);
                console.log('RENDERING:', key, valueStr);
                
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="font-bold text-zinc-900">
                      {valueStr}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Suggestions section */}
        {notification.suggestions && notification.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-black text-xs text-zinc-600 uppercase tracking-wider">Sugerencias:</h4>
            <ul className="space-y-1">
              {notification.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-zinc-600">
                  <i className="fas fa-lightbulb text-amber-500 mt-0.5 flex-shrink-0"></i>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex space-x-2 pt-2">
            {notification.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`
                  px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                  ${action.variant === 'primary' 
                    ? 'bg-brand text-white hover:bg-cyan-600' 
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar (for auto-dismiss) */}
      {notification.duration && notification.duration > 0 ? (
        <div className="absolute bottom-0 left-0 h-1 bg-zinc-200 w-full">
          <div 
            className="h-full bg-gradient-to-r from-brand to-cyan-600 transition-all ease-linear"
            style={{
              animation: `shrink ${notification.duration}ms linear forwards`
            }}
          ></div>
        </div>
      ) : null}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
