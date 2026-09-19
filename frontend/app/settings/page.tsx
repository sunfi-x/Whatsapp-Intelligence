'use client';

import React, { useEffect, useState } from 'react';
import { Save, Shield, Bot, Power, ChevronDown } from 'lucide-react';
import { Setting, GlobalAIStatus } from '@/lib/types';
import { getSettings, updateSettings } from '@/lib/api';

const TONE_TABS = [
  { key: 'Casual',       label: 'Casual',       emoji: '😎', color: '#4F8EF7' },
  { key: 'Short',        label: 'Short',        emoji: '⚡', color: '#F7A74F' },
  { key: 'Funny',        label: 'Funny',        emoji: '😂', color: '#F74F7A' },
  { key: 'Friendly',     label: 'Friendly',     emoji: '😊', color: '#4FC58E' },
  { key: 'Professional', label: 'Professional', emoji: '💼', color: '#7B61FF' },
  { key: 'Serious',      label: 'Serious',      emoji: '🎯', color: '#E5574A' },
  { key: 'Romantic',     label: 'Romantic',     emoji: '❤️', color: '#E57CA8' },
] as const;

type ToneKey = typeof TONE_TABS[number]['key'];

const DEFAULT_TONE_PROMPTS: Record<ToneKey, string> = {
  Casual: `You are my personal WhatsApp assistant replying on my behalf in CASUAL tone.

RULES:
- Reply like a real friend talking naturally — relaxed, chill, everyday language
- Use Banglish (mix of Bangla + English) naturally like how young Bangladeshis text
- Keep it short-to-medium length, NO long paragraphs
- Use 1-2 emojis max, only where it feels natural
- NO formal greetings like "Hello!" or "Dear" — just jump into the reply
- NO romantic words (jan/babu/shona/love) — this is a friend, not a lover
- Sound like ME talking, not a robot or customer service agent
- Match the energy of their message — if they're excited, be excited too`,

  Short: `You are my personal WhatsApp assistant replying on my behalf in SHORT tone.

RULES:
- Maximum 1-2 sentences ONLY. Never more than 20 words.
- Direct, quick, no fluff
- No long explanation, no unnecessary words
- Banglish is fine, keep it natural
- 0-1 emoji maximum
- NO romantic words (jan/babu/shona)
- Get straight to the point immediately
- Think: how would I reply if I was busy and typing fast?`,

  Funny: `You are my personal WhatsApp assistant replying on my behalf in FUNNY tone.

RULES:
- Be genuinely witty and humorous — Bangladeshi Gen-Z humor style
- Use clever wordplay, light sarcasm, or funny observations
- Banglish preferred — mix Bangla slang with English naturally
- Keep it fun but NOT offensive or mean-spirited
- 1-3 emojis allowed where funny (😂🤣😭 style)
- NO romantic words (jan/babu/shona) — humor is friendly, not flirty
- The reply should make them laugh or smile
- Avoid dad jokes — go for clever, relatable Gen-Z humor`,

  Friendly: `You are my personal WhatsApp assistant replying on my behalf in FRIENDLY tone.

RULES:
- Warm, caring, supportive — like a good close friend
- Show genuine interest in what they said
- Banglish natural mix — sounds like a real person, not a script
- Medium length — enough to feel engaged, not too long
- 1-2 emojis that feel warm and genuine (😊✨ style)
- NO romantic words (jan/babu/shona) — friendly ≠ romantic
- Ask follow-up questions to show you care
- Never sound robotic, formal, or distant`,

  Professional: `You are my personal WhatsApp assistant replying on my behalf in PROFESSIONAL tone.

RULES:
- Clear, respectful, and polished English
- Structured reply — address the point directly and properly
- NO slang, NO Banglish, NO emojis (unless absolutely necessary)
- Proper grammar and spelling always
- Medium length — professional but not essay-length
- Tone: confident, reliable, competent
- NO romantic language whatsoever
- Suitable for work colleagues, clients, teachers, seniors
- Start with a proper reference to their message, end with a clear closing`,

  Serious: `You are my personal WhatsApp assistant replying on my behalf in SERIOUS tone.

RULES:
- STRICTLY serious, mature, and straightforward
- Address the topic directly with NO humor, NO jokes, NO light-heartedness
- NO emojis whatsoever
- NO romantic words (jan/babu/shona/love) — ABSOLUTELY NOT
- NO casual filler words or small talk
- Language: Banglish for friends, English for formal contacts — match accordingly
- Keep it concise and meaningful — every word must count
- Tone: calm, firm, grounded — like having an important serious conversation
- If they asked something important, give a real, thoughtful answer
- NEVER mix flirty or sweet language into serious mode — this is a HARD RULE`,

  Romantic: `You are my personal WhatsApp assistant replying on my behalf in ROMANTIC tone.
This mode is EXCLUSIVELY for my girlfriend / romantic partner.

RULES:
- Warm, sweet, loving — express genuine affection
- Use Banglish naturally — mix sweet Bangla terms like (ভালোবাসি, মিস করছি) with English
- Endearing words allowed: shona, jan, love — use naturally, not excessively
- Keep it heartfelt and personal — like I actually wrote it with emotion
- 2-3 sweet emojis allowed (🥺❤️✨ style)
- Medium length — enough to feel meaningful and warm
- Reference what they said and respond with genuine emotional connection
- Sound like a caring, devoted partner — not overly dramatic or fake
- NO formal language, NO robotic phrases — pure genuine warmth`,
};

export default function SettingsPage() {
  const [tonePrompts, setTonePrompts] = useState<Record<ToneKey, string>>(DEFAULT_TONE_PROMPTS);
  const [activeTab, setActiveTab] = useState<ToneKey>('Casual');
  const [defaultLang, setDefaultLang] = useState('Banglish');
  const [defaultTone, setDefaultTone] = useState('Casual');
  const [globalStatus, setGlobalStatus] = useState<GlobalAIStatus>('ON');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await getSettings();
        setDefaultLang(d.default_language);
        setDefaultTone(d.default_tone);
        setGlobalStatus(d.global_ai_status);

        // Parse JSON personality into per-tone prompts
        if (d.personality) {
          try {
            const parsed = JSON.parse(d.personality);
            if (parsed && typeof parsed === 'object') {
              setTonePrompts(prev => ({ ...prev, ...parsed }));
            }
          } catch {
            // Old plain-text format — keep defaults
          }
        }
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
    setSaveSuccess(false);
    try {
      await updateSettings({
        personality: JSON.stringify(tonePrompts),
        default_language: defaultLang,
        default_tone: defaultTone,
        global_ai_status: globalStatus,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetTone = (tone: ToneKey) => {
    setTonePrompts(prev => ({ ...prev, [tone]: DEFAULT_TONE_PROMPTS[tone] }));
  };

  const isOn = globalStatus === 'ON';
  const activeTone = TONE_TABS.find(t => t.key === activeTab)!;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#05392E] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-2">
        <h1 className="text-2xl font-extrabold text-[#111B21] tracking-tight">System & AI Settings</h1>
        <p className="text-xs font-medium text-[#667781] mt-0.5">
          Configure master AI safety controls, 7-tier tone persona prompts, and default communication parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Global AI Toggle Card */}
        <div className="card-3d rounded-3xl p-6 border border-[#05392E]/15 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`p-3.5 rounded-2xl border transition-colors ${isOn ? 'bg-[#E8F5E9] text-[#05392E] border-[#05392E]/20' : 'bg-red-50 text-[#D32F2F] border-red-200'}`}>
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
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${isOn ? 'btn-3d-bright' : 'btn-3d-danger'}`}
            >
              <Power className="h-4 w-4" />
              <span>GLOBAL AI: {globalStatus}</span>
            </button>
          </div>
        </div>

        {/* 7-Tier Tone Persona Prompts Card */}
        <div className="card-3d rounded-3xl p-6 space-y-4 border border-[#05392E]/15 bg-white">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-[#05392E]" />
            <h3 className="font-extrabold text-base text-[#111B21]">Personal AI Persona Prompts</h3>
            <span className="ml-auto text-[10px] font-bold bg-[#E8F5E9] text-[#05392E] px-2 py-0.5 rounded-full">7 Tones</span>
          </div>
          <p className="text-xs font-medium text-[#667781]">
            Customize how the AI speaks for each tone mode. These prompts are used directly when you select a tone in Pending Approval.
          </p>

          {/* Tone Tabs */}
          <div className="flex flex-wrap gap-2">
            {TONE_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                  activeTab === tab.key
                    ? 'text-white border-transparent shadow-md scale-105'
                    : 'bg-[#F7FAF9] text-[#667781] border-[#E5EAEA] hover:border-[#05392E]/30'
                }`}
                style={activeTab === tab.key ? { backgroundColor: tab.color, borderColor: tab.color } : {}}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Active Tone Editor */}
          <div className="rounded-2xl border-2 overflow-hidden transition-all" style={{ borderColor: activeTone.color + '40' }}>
            {/* Tab Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: activeTone.color + '15' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeTone.emoji}</span>
                <span className="font-extrabold text-sm" style={{ color: activeTone.color }}>{activeTone.label} Tone Prompt</span>
              </div>
              <button
                type="button"
                onClick={() => handleResetTone(activeTab)}
                className="text-[10px] font-bold text-[#667781] hover:text-[#111B21] bg-white px-2.5 py-1 rounded-lg border border-[#E5EAEA] hover:border-[#667781] transition-all"
              >
                ↺ Reset to Default
              </button>
            </div>
            {/* Prompt Textarea */}
            <textarea
              value={tonePrompts[activeTab]}
              onChange={(e) => setTonePrompts(prev => ({ ...prev, [activeTab]: e.target.value }))}
              rows={14}
              className="w-full bg-[#F7FAF9] p-4 text-xs font-mono font-semibold text-[#111B21] focus:outline-none transition resize-none"
              placeholder={`Enter the ${activeTab} tone persona prompt here...`}
            />
          </div>

          <p className="text-[10px] font-medium text-[#667781]">
            💡 Tip: Each tone is 100% isolated. Changing one tone will not affect others.
          </p>
        </div>

        {/* System Defaults Card */}
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
                <option value="Casual">😎 Casual</option>
                <option value="Short">⚡ Short</option>
                <option value="Funny">😂 Funny</option>
                <option value="Friendly">😊 Friendly</option>
                <option value="Professional">💼 Professional</option>
                <option value="Serious">🎯 Serious</option>
                <option value="Romantic">❤️ Romantic</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveLoading}
            className={`btn-3d-bright w-full sm:w-auto justify-center px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2 disabled:opacity-50 transition-all ${saveSuccess ? 'bg-green-500' : ''}`}
          >
            <Save className="h-4 w-4 text-[#111B21]" />
            <span>{saveSuccess ? '✓ Saved Successfully!' : saveLoading ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
