import { supabase } from './supabase';

export interface Customer {
  id: string;
  phone: string;
}

const STORAGE_KEY = 'dw_customer';

export function getCustomer(): Customer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Customer) : null;
  } catch {
    return null;
  }
}

function setCustomer(customer: Customer) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
}

export function logoutCustomer() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function sendOtp(phone: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-otp', { body: { phone } });
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Could not send OTP');
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<Customer> {
  const { data, error } = await supabase.functions.invoke('verify-otp', {
    body: { phone, otp },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Incorrect or expired OTP');
  }
  const customer: Customer = { id: data.customerId, phone: data.phone };
  setCustomer(customer);
  return customer;
}
