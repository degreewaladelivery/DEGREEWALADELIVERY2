import { describeSchedule, nextRunPreview, formatPreview } from '../../lib/scheduledOrders';
import './RepeatPicker.css';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const COUNTS = [2, 3, 6, 12];

export interface RepeatChoice {
  enabled: boolean;
  dayOfMonth: number;
  occurrences: number;
}

/**
 * Sets up a monthly repeat of the order being placed.
 *
 * The next date is shown as the day changes rather than described in words
 * alone: "the 5th" is ambiguous about whether it means this month or next, and
 * a customer should not have to work that out from the rules.
 */
export function RepeatPicker({
  value,
  onChange,
}: {
  value: RepeatChoice;
  onChange: (next: RepeatChoice) => void;
}) {
  const preview = formatPreview(nextRunPreview(value.dayOfMonth));

  return (
    <section className="repeat">
      <label className="repeat__head">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        <span>
          <strong>Repeat this order monthly</strong>
          <small>We'll ask you to confirm each time — nothing is sent without you.</small>
        </span>
      </label>

      {value.enabled && (
        <div className="repeat__body">
          <p className="repeat__label">Day of the month</p>
          <div className="repeat__days">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={'repeat__chip' + (value.dayOfMonth === day ? ' is-active' : '')}
                aria-pressed={value.dayOfMonth === day}
                onClick={() => onChange({ ...value, dayOfMonth: day })}
              >
                {day}
              </button>
            ))}
          </div>

          <p className="repeat__label">How many times</p>
          <div className="repeat__counts">
            {COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                className={'repeat__chip' + (value.occurrences === count ? ' is-active' : '')}
                aria-pressed={value.occurrences === count}
                onClick={() => onChange({ ...value, occurrences: count })}
              >
                {count}×
              </button>
            ))}
          </div>

          <p className="repeat__summary">
            Every month on {describeSchedule(value.dayOfMonth)}, {value.occurrences} times.
            <br />
            First repeat: <strong>{preview}</strong>
          </p>
        </div>
      )}
    </section>
  );
}
