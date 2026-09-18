export type AIStatus = 'OFF' | 'PENDING' | 'ACTIVE';
export type MessageSender = 'CONTACT' | 'USER' | 'AI';
export type AIReplyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT' | 'SEND_FAILED';
export type GlobalAIStatus = 'ON' | 'OFF';

export interface Contact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
  preferred_language: string;
  preferred_tone: string;
  notes?: string;
  ai_status: AIStatus;
  created_at: string;
  updated_at: string;
}

export interface AIReply {
  id: number;
  message_id: number;
  generated_reply: string;
  edited_reply?: string;
  status: AIReplyStatus;
  created_at: string;
  approved_at?: string;
  sent_at?: string;
}

export interface Message {
  id: number;
  contact_id: number;
  sender: MessageSender;
  message: string;
  message_type: string;
  timestamp: string;
  whatsapp_message_id?: string;
  ai_replies?: AIReply[];
}

export interface Conversation {
  contact: Contact;
  last_message?: Message;
  pending_reply?: AIReply;
  total_messages: number;
  updated_at: string;
}

export interface Setting {
  id: number;
  user_id: number;
  personality: string;
  default_language: string;
  default_tone: string;
  global_ai_status: GlobalAIStatus;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsOverview {
  messages_received: number;
  ai_replies_generated: number;
  ai_replies_sent: number;
  ai_replies_edited: number;
  ai_replies_rejected: number;
  active_conversations: number;
  pending_approvals: number;
  off_conversations: number;
}

export interface HumanEditComparison {
  contact_name: string;
  original_ai_reply: string;
  human_edited_reply: string;
  approved_at: string;
}
