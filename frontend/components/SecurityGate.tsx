'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, Sparkles, AlertCircle, Mail } from 'lucide-react';

const DEFAULT_PIN = '2026';

export function SecurityGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session authentication status
    const authStatus = sessionStorage.getItem('sunfi_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPin = localStorage.getItem('sunfi_access_pin') || DEFAULT_PIN;

    if (pinInput.trim() === savedPin) {
      sessionStorage.setItem('sunfi_authenticated', 'true');
      setIsAuthenticated(true);
      setErrorMsg('');
      setPinInput('');
    } else {
      setErrorMsg('Incorrect Security PIN. Please contact Sunfi for access.');
      setPinInput('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAF9] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-[#05392E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F7FAF9] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient Radial Gradient Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[radial-gradient(circle_at_center,rgba(37,211,102,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-lg card-3d rounded-3xl p-6 sm:p-8 border border-[#05392E]/15 bg-white/95 backdrop-blur shadow-2xl relative z-10 text-center space-y-6">
          
          {/* Top Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#05392E] border border-[#03241D] flex items-center justify-center text-white shadow-xl animate-float-subtle">
            <Lock className="h-8 w-8 text-[#25D366]" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[11px] font-extrabold text-[#05392E] mb-2 border border-[#05392E]/20 uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-[#25D366]" />
              <span>Restricted Access Gate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111B21]">SUNFI Intelligence</h1>
            <p className="text-xs font-semibold text-[#667781] mt-1">
              Autonomous WhatsApp AI Auto-Responder & Persona Command Center
            </p>
          </div>

          {/* Detailed Credentials & Cause Notice Box */}
          <div className="rounded-2xl p-4 bg-[#F0FDF4] border border-[#25D366]/30 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-[#25D366]/20 pb-2">
              <span className="text-xs font-extrabold text-[#05392E] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#25D366]" />
                System Credentials & Privacy Notice
              </span>
            </div>
            
            <p className="text-xs font-medium text-[#2E4F46] leading-relaxed">
              This Command Center manages live <strong>Meta WhatsApp Cloud API integrations</strong>, private <strong>Google Gemini AI API keys</strong>, sensitive contact logs, and persona configurations.
            </p>
            
            <div className="p-3 rounded-xl bg-white/80 border border-[#25D366]/20 text-[11px] text-[#05392E] space-y-1">
              <p className="font-bold text-[#05392E]">Need access for evaluation or development?</p>
              <p className="text-[#33554B] font-medium leading-relaxed">
                If you need access for testing, custom AI system development, or technical review, feel free to contact me to receive the Passcode PIN.
              </p>
            </div>
          </div>

          {/* Unlock PIN Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#667781]" />
              <input
                type="password"
                placeholder="Enter Access Passcode PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={12}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] text-center text-lg font-bold tracking-widest text-[#111B21] focus:outline-none focus:border-[#05392E] focus:ring-2 focus:ring-[#25D366]/20 transition shadow-inner"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#D32F2F] bg-red-50 py-2 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-3d-bright w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-transform"
            >
              <Sparkles className="h-4 w-4 text-[#111B21]" />
              <span>Unlock Command Center</span>
            </button>
          </form>

          {/* Contact Action & Footer */}
          <div className="pt-2 border-t border-[#E5EAEA] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-semibold text-[#667781]">
            <span className="flex items-center gap-1">
              🔒 End-to-end Encrypted System
            </span>
            <a 
              href="mailto:sunfisazzad@gmail.com?subject=WhatsApp%20Intelligence%20Access%20PIN%20Request" 
              className="inline-flex items-center gap-1.5 text-[#05392E] font-bold hover:underline bg-[#E8F5E9] px-2.5 py-1 rounded-lg border border-[#05392E]/10"
            >
              <Mail className="h-3.5 w-3.5 text-[#25D366]" />
              <span>Request PIN: sunfisazzad@gmail.com</span>
            </a>
          </div>

        </div>
      </div>
    );
  }

  return <>{children}</>;
}
