/**
 * Re-exported from shared so the dashboard and the mobile app describe an order
 * the same way. Kept as a module of its own because the rest of the agent code
 * already imports from here.
 */
export type {
  AgentProfile,
  OrderItem,
  OrderRow,
  OrderStatus,
} from '@shared/agentOrders';
