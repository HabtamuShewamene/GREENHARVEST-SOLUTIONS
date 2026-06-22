'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/verify-email?token=${token}`
        );
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          // Redirect to login after 3 seconds
          setTimeout(() => router.push('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      } catch {
        setStatus('error');
        setMessage('Could not connect to the server. Please try again.');
      }
    };

    verify();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low font-body-md">
      <div className="w-full max-w-md bg-surface-container-lowest p-10 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.07)] border border-surface-container text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span
            className="material-symbols-outlined text-primary text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            eco
          </span>
          <span className="font-headline-md text-2xl font-bold text-on-background">
            Green<span className="text-primary">Harvest</span>
          </span>
        </div>

        {/* Verifying state */}
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto">
              <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin block" />
            </div>
            <h1 className="font-headline-md text-2xl font-bold text-on-background">Verifying your email…</h1>
            <p className="text-on-surface-variant text-sm">Please wait a moment.</p>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto">
              <span
                className="material-symbols-outlined text-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <h1 className="font-headline-md text-2xl font-bold text-on-background">Email Verified!</h1>
            <p className="text-on-surface-variant text-sm">{message}</p>
            <p className="text-on-surface-variant text-xs">Redirecting you to login in 3 seconds…</p>
            <Link
              href="/login"
              className="inline-block mt-4 bg-primary text-on-primary font-label-lg px-8 py-3 rounded-full hover:-translate-y-0.5 transition-all shadow-md"
            >
              Go to Login
            </Link>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto">
              <span
                className="material-symbols-outlined text-error text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                cancel
              </span>
            </div>
            <h1 className="font-headline-md text-2xl font-bold text-on-background">Verification Failed</h1>
            <p className="text-on-surface-variant text-sm">{message}</p>
            <div className="flex flex-col gap-3 mt-4">
              <Link
                href="/login"
                className="inline-block bg-primary text-on-primary font-label-lg px-8 py-3 rounded-full hover:-translate-y-0.5 transition-all shadow-md"
              >
                Go to Login
              </Link>
              <Link
                href="/register"
                className="text-primary hover:text-primary-container font-label-md text-sm transition-colors"
              >
                Register a new account
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low font-body-md">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
