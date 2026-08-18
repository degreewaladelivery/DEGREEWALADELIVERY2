import { supabase } from '../lib/supabase';
import * as agentOrders from '@shared/agentOrders';
import * as agentPool from '@shared/agentPool';
import { notifyCustomer } from '@shared/notifyCustomer';
import type { AgentProfile, OrderRow } from './types';

/**
 * Thin binding of the shared agent queries to this app's Supabase client, so
 * callers here don't have to pass it around. The queries themselves live in
 * shared/agentOrders.ts and are used by the mobile app too.
 */

export const getMyProfile = (): Promise<AgentProfile> => agentOrders.getMyProfile(supabase);

export const listOpenOrders = (): Promise<OrderRow[]> => agentOrders.listOpenOrders(supabase);

export const listMyDeliveries = (agentId: string): Promise<OrderRow[]> =>
  agentOrders.listMyDeliveries(supabase, agentId);

export const claimOrder = async (orderId: string, agentId: string): Promise<boolean> => {
  const won = await agentOrders.claimOrder(supabase, orderId, agentId);
  if (won) notifyCustomer(supabase, orderId);
  return won;
};

export const updateAgentLocation = (
  orderIds: string[],
  latitude: number,
  longitude: number
): Promise<void> => agentOrders.updateAgentLocation(supabase, orderIds, latitude, longitude);

export const markPickedUp = async (orderId: string): Promise<void> => {
  await agentOrders.markPickedUp(supabase, orderId);
  notifyCustomer(supabase, orderId);
};

export const markDelivered = async (orderId: string): Promise<void> => {
  await agentOrders.markDelivered(supabase, orderId);
  notifyCustomer(supabase, orderId);
};

export const subscribeToPool = (handlers: agentPool.AgentPoolHandlers): (() => void) =>
  agentPool.subscribeToAgentPool(supabase, handlers);

export const announceClaim = (orderId: string): Promise<void> =>
  agentPool.announceClaim(supabase, orderId);
