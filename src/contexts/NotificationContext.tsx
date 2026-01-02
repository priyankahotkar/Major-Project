import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationContainer } from '@/components/ui/notification';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  onClick?: () => void;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotification }}>
      {children}
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
