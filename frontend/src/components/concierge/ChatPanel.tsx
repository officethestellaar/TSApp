'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { Send, User, X, Loader2, CheckCheck } from 'lucide-react';
import { Message, Complaint } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ChatPanelProps {
  complaint: Complaint;
  onClose: () => void;
}

export default function ChatPanel({ complaint, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = React.useCallback(async () => {
    try {
      const response = await api.get(`complaints/${complaint.id}`);
      setMessages(response.data.messages || []);
    } catch {
      console.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [complaint.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (data: { complaintId: number, message: Message }) => {
        if (data.complaintId === complaint.id) {
          setMessages(prev => [...prev, data.message]);
        }
      };

      socket.on('new_message', handleNewMessage);
      return () => {
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [socket, complaint.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.post(`complaints/${complaint.id}/messages`, {
        content: newMessage
      });
      // Message is added via socket or we can add it manually if socket is slow
      // In our case, emitEvent is called on backend, so we might get it twice if we add manually
      // But usually we don't emit back to the sender if we want to be clean.
      // Let's see if the backend emits to everyone or just others.
      // Our backend emits to everyone. So we'll get it via socket.
      setNewMessage('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100 shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Chat Header */}
      <div className="p-6 bg-navy text-white flex justify-between items-center shadow-lg">
        <div>
          <h3 className="font-serif font-bold text-lg leading-tight">{complaint.subject}</h3>
          <p className="text-[10px] font-black text-gold/60 uppercase tracking-[0.2em] mt-1">Ticket #{complaint.id} • {complaint.category}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Complaint Context */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500 italic">"{complaint.description}"</p>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8F9FA]"
      >
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-navy/5 rounded-full flex items-center justify-center mx-auto">
              <User size={32} className="text-navy/20" />
            </div>
            <p className="text-[10px] font-black text-slate/30 uppercase tracking-widest">No conversation history discovered.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = (user?.role === 'MEMBER' && msg.senderType === 'MEMBER') || 
                         (user?.role !== 'MEMBER' && msg.senderType === 'STAFF' && msg.senderId === user?.id);
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? 'bg-navy text-white rounded-tr-none' 
                      : 'bg-white text-navy border border-slate/5 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[8px] font-black text-slate/40 uppercase tracking-widest">
                      {msg.senderName} • {format(new Date(msg.createdAt), 'HH:mm')}
                    </span>
                    {isMe && <CheckCheck size={10} className="text-gold" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input */}
      <div className="p-6 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none transition-all"
            disabled={sending}
          />
          <button 
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-gold text-navy p-3 rounded-2xl hover:bg-black hover:text-gold transition-all shadow-lg disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
