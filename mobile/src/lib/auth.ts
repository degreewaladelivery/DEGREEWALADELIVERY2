import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface Customer {
  id: string;
  phone: string;
}

const STORAGE_KEY = 'dw_customer';

export async function getCustomer(): Promise<Customer | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Customer) : null;
  } catch {
    return null;
  }
}

async function setCustomer(customer: Customer) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
}

export async function logoutCustomer() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function sendOtp(phone: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('send-otp', { body: { phone } });
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Could not send OTP');
  }
  return data.sessionId as string;
}

export async function verifyOtp(phone: string, sessionId: string, otp: string): Promise<Customer> {
  const { data, error } = await supabase.functions.invoke('verify-otp', {
    body: { phone, sessionId, otp },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Incorrect or expired OTP');
  }
  const customer: Customer = { id: data.customerId, phone: data.phone };
  await setCustomer(customer);
  return customer;
}
