// Shared helper for building WhatsApp "click to chat" deep links
// (wa.me / api.whatsapp.com) used across the manager dashboard —
// subscription approvals/rejections and the support-message CRM inbox.

/** Keeps only digits, and strips a leading "00" international prefix. */
export function toWaDigits(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits;
}

/** Builds a wa.me deep link that opens a chat with an optional prefilled message. */
export function buildWhatsAppLink(phone: string | null | undefined, message?: string): string {
  const digits = toWaDigits(phone);
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Default message sent to a user whose subscription payment was rejected —
// written in the plain Bengali the shop owners already use in-app.
export const DEFAULT_REJECTION_MESSAGE =
  'আপনার টাকা এখনো পৌঁছায়নি। অনুগ্রহ করে bKash/Nagad অ্যাপ খুলে ট্রানজেকশনটি চেক করুন অথবা সঠিক ট্রানজেকশন আইডি/স্ক্রিনশট দিয়ে আবার রিকোয়েস্ট করুন। কোনো সমস্যা হলে এই নম্বরে জানান।';
