import { supabaseAgent } from './supabaseAgent';
import * as agentOrders from '@shared/agentOrders';
import * as agentPool from '@shared/agentPool';
import { notifyCustomer } from '@shared/notifyCustomer';
import type { AgentProfile, OrderRow } from '@shared/agentOrders';

/**
 * Binds the shared agent queries to the agent Supabase client, so screens don't
 * pass it around. Same queries the web dashboard runs.
 */

export const getMyProfile = (): Promise<AgentProfile> => agentOrders.getMyProfile(supabaseAgent);

export const listOpenOrders = (): Promise<OrderRow[]> => agentOrders.listOpenOrders(supabaseAgent);

export const listMyDeliveries = (agentId: string): Promise<OrderRow[]> =>
  agentOrders.listMyDeliveries(supabaseAgent, agentId);

export const claimOrder = async (orderId: string, agentId: string): Promise<boolean> => {
  const won = await agentOrders.claimOrder(supabaseAgent, orderId, agentId);
  if (won) notifyCustomer(supabaseAgent, orderId);
  return won;
};

export const updateAgentLocation = (
  orderIds: string[],
  latitude: number,
  longitude: number
): Promise<void> => agentOrders.updateAgentLocation(supabaseAgent, orderIds, latitude, longitude);

export const markPickedUp = async (orderId: string): Promise<void> => {
  await agentOrders.markPickedUp(supabaseAgent, orderId);
  notifyCustomer(supabaseAgent, orderId);
};

export const markDelivered = async (orderId: string): Promise<void> => {
  await agentOrders.markDelivered(supabaseAgent, orderId);
  notifyCustomer(supabaseAgent, orderId);
};

export const subscribeToPool = (handlers: agentPool.AgentPoolHandlers): (() => void) =>
  agentPool.subscribeToAgentPool(supabaseAgent, handlers);

export const announceClaim = (orderId: string): Promise<void> =>
  agentPool.announceClaim(supabaseAgent, orderId);
