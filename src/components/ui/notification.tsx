import React, { useState, useEffect } from 'react';
import * as Portal from '@radix-ui/react-portal';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { Button } from './button';

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  onClose: (id: string) => void;
  onClick?: () => void;
  duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  title,
  message,
  timestamp,
  onClose,
  onClick,
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isHovered, isVisible]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    onClose(id);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <Portal.Root>
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed top-4 right-4 z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-transform duration-200"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-gray-600 mb-2">{message}</p>
              <div className="text-xs text-gray-500">
                {new Date(timestamp).toLocaleTimeString()}
              </div>
            </div>
            <div className="bg-primary/10 px-4 py-2 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                  onClose(id);
                }}
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        </Portal.Root>
      )}
    </AnimatePresence>
  );
};

interface NotificationContainerProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    onClick?: () => void;
    onClose?: () => void;
  }>;
  onClose: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
}) => {
  console.log('[NotificationContainer] render - notifications count:', notifications.length);
  console.log('[NotificationContainer] notifications:', notifications.map(n => ({ id: n.id, title: n.title })));
  return (
    <div className="fixed top-16 right-4 z-[9999] p-4 space-y-4">
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={onClose}
          // style={{
          //   top: `${(index * 120) + 16}px`
          // }}
        />
      ))}
    </div>
  );
};