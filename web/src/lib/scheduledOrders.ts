import { supabase } from './supabase';
import { SignedOutError } from './tracking';

export interface ScheduleItem {
  id: string;
  quantity: number;
  name: string;
}

export interface ScheduledOrder {
  id: string;
  items: ScheduleItem[];
  delivery_address: string;
  day_of_month: number;
  occurrences_total: number;
  occurrences_done: number;
  next_run_on: string | null;
  status: 'active' | 'finished' | 'cancelled';
  created_at: string;
}

export interface AwaitingRun {
  id: string;
  scheduled_order_id: string;
  due_on: string;
  status: 'awaiting';
}

export interface SchedulesResponse {
  schedules: ScheduledOrder[];
  awaiting: AwaitingRun[];
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('scheduled-orders', { body });
  if (data?.signedOut) throw new SignedOutError();
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Something went wrong');
  }
  return data;
}

export async function fetchSchedules(token: string): Promise<SchedulesResponse> {
  const data = await call({ token, action: 'list' });
  return { schedules: data.schedules ?? [], awaiting: data.awaiting ?? [] };
}

export interface CreateScheduleInput {
  items: { id: string; quantity: number; name: string }[];
  shopId: string | null;
  address: string;
  latitude: number;
  longitude: number;
  dayOfMonth: number;
  occurrences: number;
}

export async function createSchedule(
  token: string,
  input: CreateScheduleInput
): Promise<{ scheduleId: string; nextRunOn: string | null }> {
  const data = await call({ token, action: 'create', ...input });
  return { scheduleId: data.scheduleId, nextRunOn: data.nextRunOn ?? null };
}

export async function cancelSchedule(
  token: string,
  scheduleId: string
): Promise<SchedulesResponse> {
  const data = await call({ token, action: 'cancel', scheduleId });
  return { schedules: data.schedules ?? [], awaiting: data.awaiting ?? [] };
}

export async function confirmRun(
  token: string,
  runId: string
): Promise<{ orderId: string; total: number }> {
  const data = await call({ token, action: 'confirm', runId });
  return { orderId: data.orderId, total: data.total };
}

/**
 * The date a repeat lands on, written the way the customer picked it.
 *
 * The 31st is shown as "31st or the last day of the month", because a schedule
 * set for the 31st silently arrives on the 28th in February and someone reading
 * "31st" alone would think it had gone wrong.
 */
export function describeSchedule(dayOfMonth: number): string {
  const suffix =
    dayOfMonth % 10 === 1 && dayOfMonth !== 11
      ? 'st'
      : dayOfMonth % 10 === 2 && dayOfMonth !== 12
        ? 'nd'
        : dayOfMonth % 10 === 3 && dayOfMonth !== 13
          ? 'rd'
          : 'th';
  const day = `${dayOfMonth}${suffix}`;
  return dayOfMonth > 28 ? `the ${day} (or the last day of a shorter month)` : `the ${day}`;
}

export function formatRunDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * When the first repeat will land, mirroring the server's rule: the next
 * occurrence of that day strictly after today, clamped to the end of a short
 * month.
 *
 * Duplicated here rather than asked for, so the checkout screen can show the
 * date as the customer changes the day without a round trip. It must stay in
 * step with scheduled_order_next_date() and the bump in the scheduled-orders
 * function — if the two ever disagree the customer is told one date and gets
 * another.
 */
export function nextRunPreview(dayOfMonth: number, from: Date = new Date()): Date {
  const clampedFor = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(dayOfMonth, lastDay));
  };

  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const thisMonth = clampedFor(today.getFullYear(), today.getMonth());
  if (thisMonth > today) return thisMonth;
  return clampedFor(today.getFullYear(), today.getMonth() + 1);
}

export function formatPreview(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
