import { supabase } from '../lib/supabase';
import * as agentOrders from '@shared/agentOrders';
import * as agentPool from '@shared/agentPool';
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

export const claimOrder = (orderId: string, agentId: string): Promise<boolean> =>
  agentOrders.claimOrder(supabase, orderId, agentId);

export const updateAgentLocation = (
  orderIds: string[],
  latitude: number,
  longitude: number
): Promise<void> => agentOrders.updateAgentLocation(supabase, orderIds, latitude, longitude);

export const markPickedUp = (orderId: string): Promise<void> =>
  agentOrders.markPickedUp(supabase, orderId);

export const markDelivered = (orderId: string): Promise<void> =>
  agentOrders.markDelivered(supabase, orderId);

export const subscribeToPool = (handlers: agentPool.AgentPoolHandlers): (() => void) =>
  agentPool.subscribeToAgentPool(supabase, handlers);

export const announceClaim = (orderId: string): Promise<void> =>
  agentPool.announceClaim(supabase, orderId);
