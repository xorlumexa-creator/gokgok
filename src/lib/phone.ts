// Phone normalization + synthetic email mapping for Supabase Auth.
// We only show phone in the UI; auth uses <digits>@dukan360.app under the hood.

export const MANAGER_PHONE = '+8801305969812';

export function normalizePhone(phone: string, dialCode: string = '+880'): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // strip any leading zeros only when combining with a dial code
  const local = digits.replace(/^0+/, '');
  // If user already typed full international (e.g. 8801..., 91...), accept it
  const dial = dialCode.replace(/\D/g, '');
  if (digits.startsWith(dial)) return `+${digits}`;
  return `${dialCode}${local}`;
}

export function phoneToEmail(normalized: string): string {
  const digits = normalized.replace(/\D/g, '');
  return `${digits}@dukan360.app`;
}

export function isManagerPhone(normalized: string): boolean {
  return normalized === MANAGER_PHONE;
}

export function displayPhone(p?: string | null): string {
  if (!p) return '';
  return p;
}
