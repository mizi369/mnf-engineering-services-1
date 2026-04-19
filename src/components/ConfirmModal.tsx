import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  console.log('ConfirmModal rendered, isOpen:', isOpen);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-dark-card border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-red-500/20 text-red-500 rounded-lg">
              <AlertCircle size={20} />
            </div>
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-300 text-sm">{message}</p>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-all text-sm"
          >
            Batal
          </button>
          <button
            onClick={() => {
              console.log('ConfirmModal button clicked');
              onConfirm();
            }}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all text-sm"
          >
            Ya, Teruskan
          </button>
        </div>
      </div>
    </div>
  );
}
