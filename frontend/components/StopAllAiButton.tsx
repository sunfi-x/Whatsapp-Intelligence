'use client';

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import { stopAllAI } from '@/lib/api';

interface StopAllAiButtonProps {
  onSuccess?: () => void;
}

export const StopAllAiButton: React.FC<StopAllAiButtonProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleStopAll = async () => {
    setLoading(true);
    try {
      await stopAllAI();
      setShowConfirm(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert('Failed to execute emergency stop: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="btn-3d-danger flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold tracking-wide"
      >
        <ShieldAlert className="h-4 w-4" />
        <span>⛔ STOP ALL AI</span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111B21]/50 backdrop-blur-sm">
          <div className="card-3d w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="icon-3d-container p-3 rounded-2xl bg-red-50 border-red-200 text-[#D32F2F]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111B21]">Emergency AI Shutdown</h3>
                <p className="text-xs font-semibold text-[#667781]">Master System Override</p>
              </div>
            </div>

            <p className="text-xs font-medium text-[#667781] leading-relaxed mb-6">
              This action will immediately set <strong className="text-[#D32F2F] font-bold">AI Status to OFF</strong> across all active WhatsApp conversations. No automatic replies will be sent until manually reactivated.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="btn-3d-secondary px-4 py-2.5 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleStopAll}
                disabled={loading}
                className="btn-3d-danger flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Stop All AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
