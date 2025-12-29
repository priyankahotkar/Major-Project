import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationContainer } from '@/components/ui/notification';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  onClick?: () => void;
  onClose?: () => void;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    console.log('[NotificationContext] showNotification called:', notification.title, notification.message);
    const id = Math.random().toString(36).substring(7);
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    // Use functional updater and log resulting length for diagnostics
    setNotifications((prev) => {
      const next = [...prev, newNotification];
      try { console.log('[NotificationContext] showNotification -> new notifications length:', next.length, 'ids:', next.map(n=>n.id)); } catch(e) {}
      return next;
    });
  }, []);

  const clearNotification = useCallback((id: string) => {
    console.log('[NotificationContext] clearNotification called for id:', id);
    setNotifications((prev) => {
      const found = prev.find((n) => n.id === id);
      if (found && typeof found.onClose === 'function') {
        try { found.onClose(); } catch (e) { console.error('notification onClose error', e); }
      }
      return prev.filter((notification) => notification.id !== id);
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotification }}>
      {children}
      {/* Provider mounted */}
      {/* console.log('[NotificationContext] Provider mounted') */}
      <NotificationContainer
        notifications={notifications}
        onClose={clearNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
