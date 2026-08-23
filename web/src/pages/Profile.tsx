import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCustomer,
  logoutCustomer,
  fetchProfile,
  saveProfile,
  type CustomerProfile,
} from '../lib/auth';
import { SignedOutError } from '../lib/tracking';
import './Profile.css';

function memberSince(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function Profile() {
  const navigate = useNavigate();
  const [customer] = useState(() => getCustomer());
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) navigate('/login?next=/profile', { replace: true });
  }, [customer, navigate]);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;

    fetchProfile(customer.token)
      .then((next) => {
        if (cancelled) return;
        setProfile(next);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        if (err instanceof SignedOutError) {
          logoutCustomer().finally(() => navigate('/login?next=/profile', { replace: true }));
          return;
        }
        setError('Could not load your profile.');
      });

    return () => {
      cancelled = true;
    };
  }, [customer, navigate]);

  if (!customer) return null;

  const name = profile?.name?.trim() ?? '';

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await saveProfile(customer.token, { name: draft, email: emailDraft });
      setProfile(next);
      setEditing(false);
    } catch (err) {
      if (err instanceof SignedOutError) {
        logoutCustomer().finally(() => navigate('/login?next=/profile', { replace: true }));
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container profile">
      <h1 className="profile__heading">My Account</h1>

      {loading ? (
        <p className="profile__muted">Loading your profile…</p>
      ) : (
        <>
          <div className="profile__card">
            <div className="profile__avatar" aria-hidden="true">
              {name ? name[0].toUpperCase() : '👤'}
            </div>

            {editing ? (
              <div className="profile__edit">
                <input
                  className="profile__input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Your name"
                  maxLength={60}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                />
                <input
                  className="profile__input"
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="Email (optional)"
                  maxLength={254}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                />
                <div className="profile__editRow">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <strong className={name ? 'profile__name' : 'profile__name is-empty'}>
                  {name || 'Add your name'}
                </strong>
                <p className="profile__phone">+91 {profile?.phone ?? customer.phone}</p>
                {profile?.email && <p className="profile__phone">{profile.email}</p>}
                <button
                  type="button"
                  className="profile__editLink"
                  onClick={() => {
                    setDraft(name);
                    setEmailDraft(profile?.email ?? '');
                    setError(null);
                    setEditing(true);
                  }}
                >
                  {name ? 'Edit details' : 'Add your details'}
                </button>
              </>
            )}

            {error && <p className="profile__error">{error}</p>}
          </div>

          {/* Says why the field is worth filling in, rather than leaving it as an
              unexplained blank someone skips past. */}
          {!name && !editing && (
            <p className="profile__nudge">
              Adding your name helps your delivery agent find you at the door.
            </p>
          )}

          <div className="profile__stats">
            <div className="profile__stat">
              <strong>{profile?.orderCount ?? 0}</strong>
              <span>{profile?.orderCount === 1 ? 'Order' : 'Orders'}</span>
            </div>
            <div className="profile__stat">
              <strong>{memberSince(profile?.memberSince)}</strong>
              <span>Member since</span>
            </div>
          </div>

          <div className="profile__links">
            <Link to="/track" className="profile__row">
              <span aria-hidden="true">📦</span>
              <span className="profile__rowLabel">My Orders</span>
              <span className="profile__chev" aria-hidden="true">›</span>
            </Link>
            <Link to="/help" className="profile__row">
              <span aria-hidden="true">💬</span>
              <span className="profile__rowLabel">Help &amp; support</span>
              <span className="profile__chev" aria-hidden="true">›</span>
            </Link>
          </div>

          <button
            type="button"
            className="profile__logout"
            onClick={() => logoutCustomer().finally(() => navigate('/', { replace: true }))}
          >
            Log out
          </button>
        </>
      )}
    </div>
  );
}
