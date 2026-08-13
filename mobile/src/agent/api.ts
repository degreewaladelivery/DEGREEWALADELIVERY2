import { supabaseAgent } from './supabaseAgent';
import * as agentOrders from '@shared/agentOrders';
import type { AgentProfile, OrderRow } from '@shared/agentOrders';

/**
 * Binds the shared agent queries to the agent Supabase client, so screens don't
 * pass it around. Same queries the web dashboard runs.
 */

export const getMyProfile = (): Promise<AgentProfile> => agentOrders.getMyProfile(supabaseAgent);

export const listOpenOrders = (): Promise<OrderRow[]> => agentOrders.listOpenOrders(supabaseAgent);

export const listMyDeliveries = (agentId: string): Promise<OrderRow[]> =>
  agentOrders.listMyDeliveries(supabaseAgent, agentId);

export const claimOrder = (orderId: string, agentId: string): Promise<boolean> =>
  agentOrders.claimOrder(supabaseAgent, orderId, agentId);

export const updateAgentLocation = (
  orderIds: string[],
  latitude: number,
  longitude: number
): Promise<void> => agentOrders.updateAgentLocation(supabaseAgent, orderIds, latitude, longitude);

export const markPickedUp = (orderId: string): Promise<void> =>
  agentOrders.markPickedUp(supabaseAgent, orderId);

export const markDelivered = (orderId: string): Promise<void> =>
  agentOrders.markDelivered(supabaseAgent, orderId);
