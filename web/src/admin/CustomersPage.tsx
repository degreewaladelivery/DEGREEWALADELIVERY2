import { useEffect, useState } from 'react';
import { listCustomers } from './api';
import type { CustomerRow } from './types';

function joined(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The customer list exists so the office can reach someone — a name to put to a
 * phone number, and an email to write to by hand. Nothing here is editable:
 * these details belong to the customer, and the phone number is what signs them
 * in.
 */
export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listCustomers()
      .then(setCustomers)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load customers')
      );
  }, []);

  const term = query.trim().toLowerCase();
  const shown = (customers ?? []).filter((customer) => {
    if (!term) return true;
    return (
      (customer.name ?? '').toLowerCase().includes(term) ||
      (customer.email ?? '').toLowerCase().includes(term) ||
      customer.phone.includes(term)
    );
  });

  const withEmail = (customers ?? []).filter((c) => c.email).length;

  return (
    <div>
      <div className="admin-page__head">
        <h1>Customers</h1>
        {customers && (
          <span className="admin-customers__count">
            {customers.length} total · {withEmail} with an email
          </span>
        )}
      </div>

      {error && <p className="admin-login__error">{error}</p>}

      {!customers && !error && <p className="admin-empty">Loading customers…</p>}

      {customers && customers.length === 0 && (
        <p className="admin-empty">No one has signed up yet.</p>
      )}

      {customers && customers.length > 0 && (
        <>
          <label className="admin-field admin-customers__search">
            <span>Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email or phone"
            />
          </label>

          <div className="admin-customers__scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name || <span className="admin-customers__blank">—</span>}</td>
                    <td>+91 {customer.phone}</td>
                    <td>
                      {customer.email ? (
                        // mailto rather than plain text: reaching someone is the
                        // whole reason this column exists.
                        <a href={`mailto:${customer.email}`}>{customer.email}</a>
                      ) : (
                        <span className="admin-customers__blank">—</span>
                      )}
                    </td>
                    <td>{customer.orderCount}</td>
                    <td>{joined(customer.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shown.length === 0 && <p className="admin-empty">No customer matches “{query}”.</p>}
        </>
      )}
    </div>
  );
}
