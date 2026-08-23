import { supabase } from './supabase';
import { SignedOutError } from './tracking';

export interface Customer {
  id: string;
  phone: string;
  token: string;
}

const STORAGE_KEY = 'dw_customer';

export function getCustomer(): Customer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Customer>;
    if (!parsed.id || !parsed.phone || !parsed.token) return null;
    return parsed as Customer;
  } catch {
    return null;
  }
}

function setCustomer(customer: Customer) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
}

export async function logoutCustomer(): Promise<void> {
  const customer = getCustomer();
  localStorage.removeItem(STORAGE_KEY);
  if (!customer) return;
  await supabase.functions
    .invoke('logout', { body: { token: customer.token } })
    .catch(() => undefined);
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
  const customer: Customer = { id: data.customerId, phone: data.phone, token: data.token };
  setCustomer(customer);
  return customer;
}

export interface CustomerProfile {
  name: string;
  /** Optional. Empty string when the customer hasn't given one. */
  email: string;
  phone: string;
  memberSince: string;
  orderCount: number;
}

async function profileRequest(body: Record<string, unknown>): Promise<CustomerProfile> {
  const { data, error } = await supabase.functions.invoke('customer-profile', { body });
  if (data?.signedOut) throw new SignedOutError();
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Could not load your profile');
  }
  return data.profile as CustomerProfile;
}

export function fetchProfile(token: string): Promise<CustomerProfile> {
  return profileRequest({ token });
}

/** Only the fields passed are written, so a caller updating one cannot blank
 *  the other. */
export function saveProfile(
  token: string,
  changes: { name?: string; email?: string }
): Promise<CustomerProfile> {
  return profileRequest({ token, action: 'update', ...changes });
}
