import axios from 'axios';
import { Conversation, Contact, Setting, AnalyticsOverview, HumanEditComparison } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getConversations = async (statusFilter?: string): Promise<Conversation[]> => {
  const params = statusFilter && statusFilter !== 'ALL' ? { status_filter: statusFilter } : {};
  const res = await api.get<Conversation[]>('/conversations', { params });
  return res.data;
};

export const getPendingConversations = async (): Promise<Conversation[]> => {
  const res = await api.get<Conversation[]>('/conversations/pending');
  return res.data;
};

export const getConversationDetails = async (contactId: number) => {
  const res = await api.get(`/conversations/${contactId}`);
  return res.data;
};

export const approveAndStartAI = async (contactId: number, editedReply?: string) => {
  const res = await api.post(`/conversations/${contactId}/approve`, { edited_reply: editedReply });
  return res.data;
};

export const rejectReply = async (contactId: number) => {
  const res = await api.post(`/conversations/${contactId}/reject`);
  return res.data;
};

export const turnOffAI = async (contactId: number) => {
  const res = await api.post(`/conversations/${contactId}/turn-off`);
  return res.data;
};

export const regenerateReply = async (contactId: number, tone: string = 'Casual') => {
  const res = await api.post(`/conversations/${contactId}/regenerate`, { tone });
  return res.data;
};

export const sendManualMessage = async (contactId: number, message: string) => {
  const res = await api.post(`/conversations/${contactId}/send`, { message });
  return res.data;
};

export const stopAllAI = async () => {
  const res = await api.post('/ai/stop-all');
  return res.data;
};

export const getContacts = async (): Promise<Contact[]> => {
  const res = await api.get<Contact[]>('/contacts');
  return res.data;
};

export const updateContact = async (contactId: number, data: Partial<Contact>): Promise<Contact> => {
  const res = await api.patch<Contact>(`/contacts/${contactId}`, data);
  return res.data;
};

export const getSettings = async (): Promise<Setting> => {
  const res = await api.get<Setting>('/settings');
  return res.data;
};

export const updateSettings = async (data: Partial<Setting>): Promise<Setting> => {
  const res = await api.patch<Setting>('/settings', data);
  return res.data;
};

export const getAnalytics = async (): Promise<AnalyticsOverview> => {
  const res = await api.get<AnalyticsOverview>('/analytics');
  return res.data;
};

export const getHumanEdits = async (): Promise<HumanEditComparison[]> => {
  const res = await api.get<HumanEditComparison[]>('/analytics/edits');
  return res.data;
};

export const simulateIncomingMessage = async (senderPhone: string, senderName: string, messageText: string) => {
  const res = await api.post('/whatsapp/simulate-incoming', {
    sender_phone: senderPhone,
    sender_name: senderName,
    message_text: messageText,
  });
  return res.data;
};
