import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signin, signup } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          throw new Error('Username is required');
        }
        await signup(username.trim(), email.trim(), password);
      } else {
        await signin(email.trim(), password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1e1f22] p-4 text-[#dbdee1] select-none font-sans">
      <div className="w-full max-w-[480px] rounded-md bg-[#313338] p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSignUp ? 'Create an account' : 'Welcome back!'}
          </h1>
          <p className="text-sm text-[#949ba4]">
            {isSignUp
              ? 'Join your SurrealDB real-time workspace'
              : "We're so excited to see you again!"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded bg-[#da373c]/15 border border-[#da373c] p-3 text-sm text-[#fa777c]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                Username <span className="text-[#da373c]">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white placeholder-[#80848e] outline-none transition focus:ring-2 focus:ring-[#5865f2] disabled:opacity-50"
                placeholder="ferris"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Email <span className="text-[#da373c]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white placeholder-[#80848e] outline-none transition focus:ring-2 focus:ring-[#5865f2] disabled:opacity-50"
              placeholder="ferris@test.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Password <span className="text-[#da373c]">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white placeholder-[#80848e] outline-none transition focus:ring-2 focus:ring-[#5865f2] disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-[#5865f2] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752c4] active:bg-[#3c45a5] disabled:cursor-not-allowed disabled:opacity-50 mt-2"
          >
            {submitting
              ? 'Processing...'
              : isSignUp
              ? 'Continue'
              : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-xs text-[#949ba4]">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
                className="text-[#00a8fc] hover:underline"
              >
                Log In
              </button>
            </span>
          ) : (
            <span>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
                className="text-[#00a8fc] hover:underline"
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};