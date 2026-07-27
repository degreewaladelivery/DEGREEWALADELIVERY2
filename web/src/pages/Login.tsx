import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendOtp, verifyOtp, getCustomer, logoutCustomer } from '../lib/auth';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [customer, setCustomerState] = useState(getCustomer());
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const otpValid = otp.replace(/\D/g, '').length === 6;

  const onSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneValid) return;
    setLoading(true);
    setError(null);
    try {
      const id = await sendOtp(phone);
      setSessionId(id);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otpValid) return;
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(phone, sessionId, otp);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect OTP');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    logoutCustomer();
    setCustomerState(null);
  };

  if (customer) {
    return (
      <div className="container login">
        <div className="login__card">
          <span className="login__mark">🛵</span>
          <h1 className="login__title">You're logged in</h1>
          <p className="login__sub">+91 {customer.phone}</p>
          <button className="btn btn-light btn-lg btn-block" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container login">
      <div className="login__card">
        <span className="login__mark">🛵</span>
        <h1 className="login__title">
          Welcome to Degree<span className="brand__accent">wala</span>
        </h1>
        <p className="login__sub">
          {step === 'phone' ? 'Enter your phone number to continue' : `Enter the OTP sent to +91 ${phone}`}
        </p>

        {step === 'phone' ? (
          <form className="login__form" onSubmit={onSendOtp}>
            <div className="login__field">
              <span className="login__cc">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                aria-label="Phone number"
                autoFocus
              />
            </div>
            {error && <p className="login__error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!phoneValid || loading}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form className="login__form" onSubmit={onVerifyOtp}>
            <div className="login__field">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit OTP"
                aria-label="OTP"
                autoFocus
              />
            </div>
            {error && <p className="login__error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!otpValid || loading}>
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button
              type="button"
              className="login__back"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError(null);
              }}
            >
              ← Change number
            </button>
          </form>
        )}

        <p className="login__terms">By continuing you agree to our Terms & Privacy Policy.</p>
      </div>
    </div>
  );
}
