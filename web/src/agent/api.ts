import { supabase } from '../lib/supabase';
import type { AgentProfile, OrderRow } from './types';

export async function getMyProfile(): Promise<AgentProfile> {
  const { data, error } = await supabase.from('delivery_agents').select('*').single();
  if (error) throw error;
  return data;
}

export async function listOpenOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .is('claimed_by', null)
    .eq('status', 'placed')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as OrderRow[];
}

export async function listMyDeliveries(agentId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('claimed_by', agentId)
    .neq('status', 'delivered')
    .order('claimed_at', { ascending: true });
  if (error) throw error;
  return data as OrderRow[];
}

export async function claimOrder(orderId: string, agentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .update({ claimed_by: agentId, claimed_at: new Date().toISOString(), status: 'claimed' })
    .eq('id', orderId)
    .is('claimed_by', null)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function markPickedUp(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function markDelivered(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}
