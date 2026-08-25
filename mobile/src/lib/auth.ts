import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { SignedOutError } from './tracking';
import { registerCustomerForPush, unregisterCustomerFromPush } from './customerPush';

export interface Customer {
  id: string;
  phone: string;
  token: string;
}

const STORAGE_KEY = 'dw_customer';

export async function getCustomer(): Promise<Customer | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Customer>;
    if (!parsed.id || !parsed.phone || !parsed.token) return null;
    return parsed as Customer;
  } catch {
    return null;
  }
}

async function setCustomer(customer: Customer) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
}

export async function logoutCustomer(): Promise<void> {
  const customer = await getCustomer();
  await AsyncStorage.removeItem(STORAGE_KEY);
  if (!customer) return;
  // Before the session is revoked, while the token is still accepted.
  await unregisterCustomerFromPush(customer.token).catch(() => undefined);
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

export interface VerifiedSignIn {
  customer: Customer;
  /** True when this account has no name yet, so sign-in should ask for one. */
  needsProfile: boolean;
}

export async function verifyOtp(phone: string, otp: string): Promise<VerifiedSignIn> {
  const { data, error } = await supabase.functions.invoke('verify-otp', {
    body: { phone, otp },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Incorrect or expired OTP');
  }
  const customer: Customer = { id: data.customerId, phone: data.phone, token: data.token };
  await setCustomer(customer);
  // Not awaited: a customer who declines notifications, or a phone without Play
  // Services, must still finish signing in.
  registerCustomerForPush(customer.token, { ask: true }).catch(() => undefined);
  return { customer, needsProfile: !data.hasName };
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
