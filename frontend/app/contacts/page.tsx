'use client';

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Contact } from '@/lib/types';
import { getContacts, updateContact } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  // Form edit state
  const [relationship, setRelationship] = useState('Unknown');
  const [prefLang, setPrefLang] = useState('Banglish');
  const [prefTone, setPrefTone] = useState('Casual');
  const [notes, setNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const loadContacts = async () => {
    try {
      const data = await getContacts();
      setContacts(data);
      if (data.length > 0 && !selectedContact) {
        selectContact(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const selectContact = (c: Contact) => {
    setSelectedContact(c);
    setRelationship(c.relationship || 'Unknown');
    setPrefLang(c.preferred_language || 'Banglish');
    setPrefTone(c.preferred_tone || 'Casual');
    setNotes(c.notes || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    setSaveLoading(true);
    try {
      const updated = await updateContact(selectedContact.id, {
        relationship,
        preferred_language: prefLang,
        preferred_tone: prefTone,
        notes,
      });
      setSelectedContact(updated);
      loadContacts();
      alert('Contact preferences saved successfully!');
    } catch {
      alert('Failed to save contact preferences');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pb-2">
        <h1 className="text-2xl font-extrabold text-[#111B21] tracking-tight">Contacts & AI Preferences</h1>
        <p className="text-xs font-medium text-[#667781] mt-0.5">
          Configure contact relationship depth, preferred language model, conversation tone, and persona memory context.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact List Column */}
        <div className="space-y-3">
          {contacts.map((c) => {
            const isSelected = selectedContact?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => selectContact(c)}
                className={`card-3d rounded-3xl p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#05392E] bg-[#E8F5E9] shadow-md ring-2 ring-[#05392E]/20'
                    : 'card-3d-hover border-[#05392E]/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#05392E] border border-[#03241D] flex items-center justify-center font-extrabold text-white text-base shadow-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#111B21]">{c.name}</h3>
                      <p className="text-xs font-semibold text-[#667781]"><span className="font-digits">{c.phone}</span></p>
                    </div>
                  </div>
                  <StatusBadge status={c.ai_status} size="sm" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Preferences Form */}
        {selectedContact && (
          <form
            onSubmit={handleSave}
            className="md:col-span-2 card-3d rounded-3xl p-6 space-y-6 border border-[#05392E]/15 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#E5EAEA]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#05392E] border border-[#03241D] flex items-center justify-center font-extrabold text-white text-xl shadow-sm">
                  {selectedContact.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#111B21]">{selectedContact.name}</h2>
                  <span className="text-xs font-semibold text-[#667781]"><span className="font-digits">{selectedContact.phone}</span></span>
                </div>
              </div>
              <StatusBadge status={selectedContact.ai_status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#667781] mb-2">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] px-3.5 py-2.5 text-xs font-bold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner cursor-pointer"
                >
                  <option value="Friend">Friend</option>
                  <option value="Girlfriend">Girlfriend / Romantic Partner ❤️</option>
                  <option value="Classmate">Classmate</option>
                  <option value="Family">Family</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Professional">Professional</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#667781] mb-2">
                  Preferred Language
                </label>
                <select
                  value={prefLang}
                  onChange={(e) => setPrefLang(e.target.value)}
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
                  Preferred Tone
                </label>
                <select
                  value={prefTone}
                  onChange={(e) => setPrefTone(e.target.value)}
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

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#667781] mb-2">
                Memory Notes & Persona Context
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Add important memory context (e.g., Rakib is a classmate working on university project...)"
                className="w-full rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] p-4 text-xs font-semibold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5EAEA]">
              <button
                type="submit"
                disabled={saveLoading}
                className="btn-3d-bright px-6 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4 text-[#111B21]" />
                <span>Save Contact Preferences</span>
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}
