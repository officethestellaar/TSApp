'use client';

import React, { useState } from 'react';
import { Star, Send, X, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  memberId?: number | null;
  memberName?: string | null;
  department?: string;
}

export default function ImmediateFeedbackModal({ onClose, memberId, memberName, department = 'RESTAURANT' }: Props) {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('reports/feedback', {
        memberId,
        memberName: memberName || 'Guest',
        rating,
        comments,
        department
      });
      
      if (rating <= 3) {
        toast.success('Thank you. A manager has been alerted to assist you immediately.');
      } else {
        toast.success('Thank you for your valuable feedback!');
      }
      onClose();
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-end">
             <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 rounded-full hover:text-navy transition-colors">
                <X size={16} />
             </button>
          </div>
          
          <div>
            <h2 className="text-2xl font-serif font-bold text-navy">Guest Experience</h2>
            <p className="text-sm text-gray-500 mt-2">How was your experience today at the {department}?</p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star}
                onClick={() => setRating(star)}
                className={`p-2 transition-all transform hover:scale-110 ${rating >= star ? 'text-gold' : 'text-gray-200'}`}
              >
                <Star size={40} fill={rating >= star ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>

          {rating <= 3 && (
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 text-left">
              <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800 font-medium">We apologize that we didn't meet your expectations. A Guest Relations Manager will assist you shortly.</p>
            </div>
          )}

          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tell us more about your experience (Optional)..."
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-gold/30 resize-none h-24"
          ></textarea>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : <><Send size={16} /> Submit Feedback</>}
          </button>
        </div>
      </div>
    </div>
  );
}
