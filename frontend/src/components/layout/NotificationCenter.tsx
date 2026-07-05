'use client';

import React, { useState } from 'react';
import { useSocket, Notification } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Bell, X, Check, Trash2, Info, CreditCard, Utensils, Shield, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const { notifications, markAsRead, clearNotifications } = useSocket();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getActivityHref = () => {
    if (!user) return '/dashboard';
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR'].includes(user.role);
    if (isAdmin) return '/dashboard/access-logs';
    if (user.role === 'MEMBER') return '/member/activities';
    return '/dashboard';
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'invoice': return <CreditCard className="text-blue-500" size={16} />;
      case 'kot': return <Utensils className="text-orange-500" size={16} />;
      case 'access': return <Shield className="text-green-500" size={16} />;
      case 'announcement': return <Megaphone className="text-gold" size={16} />;
      default: return <Info className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Estate Intelligence</h3>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <button 
                  onClick={clearNotifications}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                  title="Purge Logs"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell size={20} className="text-white/10" />
                </div>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No active nodes</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 hover:bg-white/[0.02] transition-colors group relative ${!n.read ? 'bg-white/[0.01]' : ''}`}
                  >
                    <div className="flex gap-4">
                      <div className={`mt-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-gold/20 transition-colors`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-[11px] font-black tracking-tight ${!n.read ? 'text-white' : 'text-white/60'}`}>{n.title}</p>
                          {!n.read && (
                            <button 
                              onClick={() => markAsRead(n.id)}
                              className="p-1 hover:bg-gold/10 rounded-md text-gold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check size={10} />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-2">
                          {formatDistanceToNow(n.timestamp)} ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/5 bg-black/20 text-center">
              <Link 
                href={getActivityHref()}
                onClick={() => setIsOpen(false)}
                className="text-[9px] font-black text-gold/40 hover:text-gold uppercase tracking-[0.2em] transition-colors block w-full"
              >
                View All Activity
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
