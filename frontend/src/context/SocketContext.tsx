'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  type: 'invoice' | 'kot' | 'access' | 'announcement' | 'activity';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface ExportApproval {
  requestId: number;
  status: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  exportApprovals: ExportApproval[];
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  notifications: [],
  markAsRead: () => {},
  clearNotifications: () => {},
  exportApprovals: [],
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [exportApprovals, setExportApprovals] = useState<ExportApproval[]>([]);

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [
      {
        ...notif,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        read: false
      },
      ...prev
    ].slice(0, 20)); // Keep last 20
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const getSocketURL = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
      }
      if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:5001`;
      }
      return 'http://localhost:5001';
    };

    const socketInstance = io(getSocketURL(), {
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Real-time connection active');
      setIsConnected(true);

      // Register this specific node for targeted notifications
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          socketInstance.emit('register_node', {
            userId: userData.id,
            role: userData.role,
            affiliateId: userData.affiliateId
          });
        } catch (e) {
          console.error('[Socket] Failed to register node identity', e);
        }
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Real-time connection lost');
      setIsConnected(false);
    });

    // Global listeners for notifications
    socketInstance.on('new_invoice', (data) => {
      const message = `Invoice ${data.invoiceNumber} for ₹${data.total}`;
      addNotification({
        type: 'invoice',
        title: 'New Invoice Generated',
        message
      });
      toast.success(`New Invoice: ${data.invoiceNumber} for ${data.memberName} (₹${data.total})`, {
        duration: 5000,
        position: 'top-right',
        style: { background: '#0f172a', color: '#c5a059', border: '1px solid #c5a059' }
      });
    });

    socketInstance.on('new_kot', (data) => {
      const message = `Order ${data.orderNumber} for Table ${data.tableNumber}`;
      addNotification({
        type: 'kot',
        title: 'New KOT Received',
        message
      });
      toast(`New KOT: ${data.orderNumber} for Table ${data.tableNumber}`, {
        icon: '🍳',
        duration: 5000,
        position: 'top-right',
        style: { background: '#0f172a', color: '#fff', border: '1px solid #e2c275' }
      });
    });

    socketInstance.on('new_announcement', (data) => {
      addNotification({
        type: 'announcement',
        title: 'New Estate Notice',
        message: data.title
      });
      toast(data.title, {
        icon: '📢',
        duration: 6000,
        position: 'top-right',
        style: { background: '#c5a059', color: '#0f172a', fontWeight: 'bold' }
      });
    });

    socketInstance.on('new_message', (data) => {
      addNotification({
        type: 'announcement', // Using announcement icon for now or we can add 'message' type
        title: 'New Concierge Message',
        message: `${data.message.senderName}: ${data.message.content.substring(0, 50)}...`
      });
      toast(`New message from ${data.message.senderName}`, {
        icon: '💬',
        duration: 4000,
        position: 'top-right'
      });
    });

    socketInstance.on('payment_confirmed', (data) => {
      addNotification({
        type: 'invoice',
        title: 'Payment Confirmed',
        message: `₹${data.amountReceived} received from ${data.memberName} for ${data.invoiceNumber}. Balance: ₹${data.balance}`
      });
      toast.success(`${data.memberName}: ₹${data.amountReceived} paid for ${data.invoiceNumber}. Balance: ₹${data.balance}`, {
        duration: 7000,
        position: 'top-right',
        style: { background: '#0f172a', color: '#4ade80', border: '1px solid #4ade80' }
      });
    });

    socketInstance.on('low_stock_alert', (data) => {
      addNotification({
        type: 'announcement',
        title: 'Low Stock Alert',
        message: `${data.name} is running low (${data.currentStock} ${data.unit} remaining)`
      });
      toast.error(`Critical Stock: ${data.name} is low!`, {
        icon: '⚠️',
        duration: 8000,
        position: 'top-right'
      });
    });

    socketInstance.on('new_access_log', (data) => {
      addNotification({
        type: 'access',
        title: data.isAllowed ? 'Access Granted' : 'Access Denied',
        message: `${data.memberName} at ${data.location}`
      });
      if (data.isAllowed) {
        toast.success(`Access: ${data.memberName} at ${data.location}`, { position: 'bottom-right' });
      } else {
        toast.error(`Denial: ${data.memberName} - ${data.denialReason}`, { position: 'bottom-right' });
      }
    });

    socketInstance.on('activity_update', (data) => {
      if (data.action === 'CREATED' && data.activity) {
        addNotification({
          type: 'activity',
          title: 'New Estate Experience',
          message: `${data.activity.name} has been added to the curation registry.`
        });
        toast(`New Experience Added: ${data.activity.name}`, {
          icon: '✨',
          duration: 6000,
          position: 'top-right',
          style: { background: '#0f172a', color: '#c5a059', border: '1px solid #c5a059' }
        });
      }
    });

    // Export approval events
    socketInstance.on('export_request_approved', (data) => {
      setExportApprovals(prev => [...prev.filter(a => a.requestId !== data.requestId), { requestId: data.requestId, status: 'APPROVED' }]);
      toast.success('Your export request has been approved!', {
        duration: 6000,
        position: 'top-right',
      });
    });

    socketInstance.on('export_request_rejected', (data) => {
      setExportApprovals(prev => [...prev.filter(a => a.requestId !== data.requestId), { requestId: data.requestId, status: 'REJECTED' }]);
      toast.error('Your export request was rejected.', {
        duration: 6000,
        position: 'top-right',
      });
    });

    socketInstance.on('new_export_request', (data) => {
      addNotification({
        type: 'announcement',
        title: 'New Export Request',
        message: `${data.userName} wants to export ${data.page}: ${data.reason}`
      });
      toast(`${data.userName} wants to export ${data.page} data`, {
        icon: '📄',
        duration: 8000,
        position: 'top-right',
        style: { background: '#0f172a', color: '#c5a059', border: '1px solid #c5a059' }
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications, markAsRead, clearNotifications, exportApprovals }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
