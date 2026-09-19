'use client';

import React, { useEffect, useState } from 'react';
import { Save, Shield, Bot, Power } from 'lucide-react';
import { Setting, GlobalAIStatus } from '@/lib/types';
import { getSettings, updateSettings } from '@/lib/api';

export default function SettingsPage() {
  const [personality, setPersonality] = useState('');
  const [defaultLang, setDefaultLang] = useState('Banglish');
  const [defaultTone, setDefaultTone] = useState('Casual');
  const [globalStatus, setGlobalStatus] = useState<GlobalAIStatus>('ON');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await getSettings();
        setPersonality(d.personality);
        setDefaultLang(d.default_language);
        setDefaultTone(d.default_tone);
        setGlobalStatus(d.global_ai_status);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await updateSettings({
        personality,
        default_language: defaultLang,
        default_tone: defaultTone,
        global_ai_status: globalStatus,
      });
      alert('Global settings saved successfully!');
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const isOn = globalStatus === 'ON';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-2">
        <h1 className="text-2xl font-extrabold text-[#111B21] tracking-tight">System & AI Settings</h1>
        <p className="text-xs font-medium text-[#667781] mt-0.5">
          Configure master AI safety controls, personal persona prompt, and default communication parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 3D Master AI Toggle Card */}
        <div className="card-3d rounded-3xl p-6 border border-[#05392E]/15 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3.5 rounded-2xl border transition-colors ${
                  isOn ? 'bg-[#E8F5E9] text-[#05392E] border-[#05392E]/20' : 'bg-red-50 text-[#D32F2F] border-red-200'
                }`}
              >
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#111B21]">Global AI Safety Toggle</h3>
                <p className="text-xs font-medium text-[#667781]">
                  Master system override. Turning OFF stops all automated sending across every conversation.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setGlobalStatus(isOn ? 'OFF' : 'ON')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                isOn ? 'btn-3d-bright' : 'btn-3d-danger'
              }`}
            >
              <Power className="h-4 w-4" />
              <span>GLOBAL AI: {globalStatus}</span>
            </button>
          </div>
        </div>

        {/* 3D Persona Prompt Editor Card */}
        <div className="card-3d rounded-3xl p-6 space-y-4 border border-[#05392E]/15 bg-white">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-[#05392E]" />
            <h3 className="font-extrabold text-base text-[#111B21]">Personal AI Persona Prompt</h3>
          </div>
          <p className="text-xs font-medium text-[#667781]">
            Customize how the AI speaks on your behalf. Edit communication guidelines, slang usage, emoji frequency, and natural reply styles.
          </p>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={10}
            className="w-full rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] p-4 text-xs font-mono font-semibold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner"
          />
        </div>

        {/* 3D System Defaults Card */}
        <div className="card-3d rounded-3xl p-6 space-y-4 border border-[#05392E]/15 bg-white">
          <h3 className="font-extrabold text-base text-[#111B21]">System Communication Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#667781] mb-2">
                Default Language
              </label>
              <select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                className="w-full rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] px-3.5 py-2.5 text-xs font-bold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner cursor-pointer"
              >
                <option value="Banglish">Banglish (Bangla + English)</option>
                <option value="English">English</option>
                <option value="Bangla">Bangla</option>
                <option value="Auto">Auto Detect</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#667781] mb-2">
                Default Tone
              </label>
              <select
                value={defaultTone}
                onChange={(e) => setDefaultTone(e.target.value)}
                className="w-full rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] px-3.5 py-2.5 text-xs font-bold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner cursor-pointer"
              >
                <option value="Casual">Casual</option>
                <option value="Romantic / Loving">Romantic / Loving 🥰</option>
                <option value="Friendly">Friendly</option>
                <option value="Professional">Professional</option>
                <option value="Funny">Funny</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveLoading}
            className="btn-3d-bright w-full sm:w-auto justify-center px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4 text-[#111B21]" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>

    </div>
  );
}
