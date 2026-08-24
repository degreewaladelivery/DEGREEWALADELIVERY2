import { useEffect, useState } from 'react';
import {
  fetchSchedules,
  cancelSchedule,
  confirmRun,
  describeSchedule,
  formatRunDate,
  type ScheduledOrder,
  type AwaitingRun,
} from '../../lib/scheduledOrders';
import './ScheduledSection.css';

/**
 * Repeat orders: what is waiting to be confirmed, and what is still scheduled.
 *
 * Anything awaiting confirmation comes first and is styled as an action, because
 * it expires at the end of the day — an unconfirmed run is skipped, so a card
 * that reads as information rather than a decision costs the customer a
 * delivery.
 */
export function ScheduledSection({
  token,
  onConfirmed,
}: {
  token: string;
  onConfirmed: () => void;
}) {
  const [schedules, setSchedules] = useState<ScheduledOrder[]>([]);
  const [awaiting, setAwaiting] = useState<AwaitingRun[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSchedules(token)
      .then((data) => {
        if (cancelled) return;
        setSchedules(data.schedules);
        setAwaiting(data.awaiting);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onConfirm = async (run: AwaitingRun) => {
    setBusyId(run.id);
    setError(null);
    try {
      await confirmRun(token, run.id);
      const data = await fetchSchedules(token);
      setSchedules(data.schedules);
      setAwaiting(data.awaiting);
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm that delivery.');
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async (schedule: ScheduledOrder) => {
    const remaining = schedule.occurrences_total - schedule.occurrences_done;
    if (
      !confirm(
        `Cancel this repeat? The ${remaining} remaining monthly ${
          remaining === 1 ? 'delivery' : 'deliveries'
        } will not be scheduled.`
      )
    ) {
      return;
    }
    setBusyId(schedule.id);
    setError(null);
    try {
      const data = await cancelSchedule(token, schedule.id);
      setSchedules(data.schedules);
      setAwaiting(data.awaiting);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel that repeat.');
    } finally {
      setBusyId(null);
    }
  };

  const active = schedules.filter((s) => s.status === 'active');
  if (!loaded || (active.length === 0 && awaiting.length === 0)) return null;

  const itemsOf = (schedule: ScheduledOrder | undefined) =>
    schedule ? schedule.items.map((i) => `${i.name} ×${i.quantity}`).join(', ') : 'Your repeat order';

  return (
    <section className="sched">
      <h2 className="sched__heading">Repeat Deliveries</h2>
      {error && <p className="sched__error">{error}</p>}

      {awaiting.map((run) => {
        const schedule = schedules.find((s) => s.id === run.scheduled_order_id);
        return (
          <div key={run.id} className="sched__due">
            <strong className="sched__dueTitle">Due today</strong>
            <p className="sched__dueBody">{itemsOf(schedule)}</p>
            <p className="sched__dueNote">
              Confirm before the day ends, or this month is skipped. Priced when you confirm.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busyId === run.id}
              onClick={() => onConfirm(run)}
            >
              {busyId === run.id ? 'Confirming…' : 'Confirm delivery'}
            </button>
          </div>
        );
      })}

      {active.map((schedule) => (
        <div key={schedule.id} className="sched__card">
          <strong>{itemsOf(schedule)}</strong>
          <p className="sched__meta">Every month on {describeSchedule(schedule.day_of_month)}</p>
          <p className="sched__meta">
            {schedule.occurrences_total - schedule.occurrences_done} of{' '}
            {schedule.occurrences_total} left
            {schedule.next_run_on ? ` · next ${formatRunDate(schedule.next_run_on)}` : ''}
          </p>
          <button
            type="button"
            className="sched__cancel"
            disabled={busyId === schedule.id}
            onClick={() => onCancel(schedule)}
          >
            {busyId === schedule.id ? 'Cancelling…' : 'Cancel repeat'}
          </button>
        </div>
      ))}
    </section>
  );
}
