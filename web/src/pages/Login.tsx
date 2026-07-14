import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');

  const valid = phone.replace(/\D/g, '').length === 10;

  return (
    <div className="container login">
      <div className="login__card">
        <span className="login__mark">🛵</span>
        <h1 className="login__title">
          Welcome to Degree<span className="brand__accent">wala</span>
        </h1>
        <p className="login__sub">Enter your phone number to continue</p>

        <form
          className="login__form"
          onSubmit={(e) => {
            e.preventDefault();

            if (valid) navigate('/');
          }}
        >
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
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!valid}>
            Continue
          </button>
        </form>

        <p className="login__terms">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
