import React from 'react';
import { Button } from './ui/button';
import { useNotification } from '../contexts/NotificationContext';

export const TestNotifications: React.FC = () => {
  const { showNotification } = useNotification();

  return (
    <div className="fixed top-4 left-4 space-y-2">
      <Button
        onClick={() => showNotification('Test Info Notification', 'info')}
        className="bg-blue-500 hover:bg-blue-600"
      >
        Test Info
      </Button>
      <Button
        onClick={() => showNotification('Test Success Notification', 'success')}
        className="bg-green-500 hover:bg-green-600"
      >
        Test Success
      </Button>
      <Button
        onClick={() => showNotification('Test Error Notification', 'error')}
        className="bg-red-500 hover:bg-red-600"
      >
        Test Error
      </Button>
    </div>
  );
};