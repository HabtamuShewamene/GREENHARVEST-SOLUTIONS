/**
 * Registration Page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { UserRole } from '@/types';

const roles = [
  {
    value: 'buyer' as UserRole,
    title: 'Buyer',
    description: 'Shop for fresh farm produce',
    icon: 'shopping_basket',
  },
  {
    value: 'farmer' as UserRole,
    title: 'Farmer',
    description: 'Sell your agricultural products',
    icon: 'agriculture',
  },
  {
    value: 'delivery_partner' as UserRole,
    title: 'Delivery Partner',
    description: 'Deliver products to customers',
    icon: 'local_shipping',
  },
  {
    value: 'field_agent' as UserRole,
    title: 'Field Agent',
    description: 'Help farmers list products',
    icon: 'support_agent',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '', address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Full name is required';
    if (!formData.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 8) e.password = 'At least 8 characters';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!formData.phone) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    try {
      await api.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: selectedRole,
        phone: formData.phone,
        address: formData.address || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setErrors({ general: err.response?.data?.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low px-4 font-body-md text-on-surface">
        <div className="bg-surface-container-lowest rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-surface-container p-12 max-w-md w-full text-center">
          <div className="w-24 h-24 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
          </div>
          <h2 className="font-headline-md text-3xl font-bold text-on-background mb-2">Account Created!</h2>
          <p className="font-body-md text-on-surface-variant">Redirecting you to sign in...</p>
          <div className="mt-8 w-full bg-surface-variant rounded-full h-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[grow_2.5s_linear_forwards]" style={{ width: '100%', transformOrigin: 'left', animation: 'none', transition: 'width 2.5s linear' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low py-12 px-4 font-body-md text-on-surface flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="font-headline-md font-bold text-2xl text-on-background">
              Green<span className="text-primary">Harvest</span>
            </span>
          </Link>
          <h1 className="font-headline-md text-4xl font-bold text-on-background mb-3">Create your account</h1>
          <p className="font-body-md text-on-surface-variant text-lg">
            Already have one?{' '}
            <Link href="/login" className="text-primary hover:text-primary-container font-bold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {['Choose Role', 'Your Details'].map((label, i) => {
            const isActive = (i === 0 && step === 'role') || (i === 1 && step === 'details');
            const isDone = i === 0 && step === 'details';
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-lg transition-all ${
                    isDone ? 'bg-primary text-on-primary' : isActive ? 'bg-secondary-container text-on-background' : 'bg-surface-variant text-on-surface-variant'
                  }`}>
                    {isDone ? <span className="material-symbols-outlined text-sm font-bold">check</span> : i + 1}
                  </div>
                  <span className={`font-label-lg ${isActive ? 'text-on-background' : 'text-on-surface-variant'}`}>{label}</span>
                </div>
                {i === 0 && <div className={`w-16 h-1 rounded-full ${step === 'details' ? 'bg-primary' : 'bg-surface-variant'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1 — Role */}
        {step === 'role' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => { setSelectedRole(role.value); setStep('details'); }}
                className={`group text-left p-8 rounded-[32px] border-2 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] ${
                  selectedRole === role.value 
                    ? 'border-primary bg-primary/5 shadow-md ring-4 ring-primary/10' 
                    : 'bg-surface-container-lowest border-surface-container hover:border-primary/30'
                }`}
              >
                <div className="w-16 h-16 rounded-[20px] bg-secondary-container/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary-container/20 transition-all duration-300">
                  <span className="material-symbols-outlined text-4xl text-primary">{role.icon}</span>
                </div>
                <h3 className="font-headline-md font-bold text-on-background text-[24px] mb-2">{role.title}</h3>
                <p className="font-body-md text-on-surface-variant leading-relaxed">{role.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 'details' && (
          <div className="bg-surface-container-lowest rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-surface-container p-8 md:p-12">
            <button
              onClick={() => setStep('role')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-label-md mb-8 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Change role
            </button>

            <div className="flex items-center gap-4 mb-10 p-5 bg-surface-container-low rounded-[24px] border border-outline-variant/30">
              <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary text-2xl">{roles.find(r => r.value === selectedRole)?.icon}</span>
              </div>
              <div>
                <p className="font-label-md text-on-surface-variant uppercase tracking-widest mb-1">Registering as</p>
                <p className="font-headline-md text-on-background text-xl capitalize">{selectedRole}</p>
              </div>
            </div>

            {errors.general && (
              <div className="flex items-start gap-3 bg-error-container border border-error/20 text-on-error-container rounded-[20px] p-4 mb-8">
                <span className="material-symbols-outlined shrink-0 mt-0.5">error</span>
                <p className="font-body-md text-sm">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block font-label-lg text-on-background mb-2">Full Name</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder="John Doe" required
                    className={`w-full px-6 py-4 bg-surface-container-low border rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${errors.name ? 'border-error focus:ring-error-container' : 'border-outline-variant focus:border-primary focus:ring-primary-container/30'}`}
                  />
                  {errors.name && <p className="text-error font-body-md text-xs mt-2">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block font-label-lg text-on-background mb-2">Email Address</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="you@example.com" required
                    className={`w-full px-6 py-4 bg-surface-container-low border rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${errors.email ? 'border-error focus:ring-error-container' : 'border-outline-variant focus:border-primary focus:ring-primary-container/30'}`}
                  />
                  {errors.email && <p className="text-error font-body-md text-xs mt-2">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-label-lg text-on-background mb-2">Phone Number</label>
                  <input
                    type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="+1 (555) 000-0000" required
                    className={`w-full px-6 py-4 bg-surface-container-low border rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${errors.phone ? 'border-error focus:ring-error-container' : 'border-outline-variant focus:border-primary focus:ring-primary-container/30'}`}
                  />
                  {errors.phone && <p className="text-error font-body-md text-xs mt-2">{errors.phone}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block font-label-lg text-on-background mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                      placeholder="Min. 8 characters" required
                      className={`w-full px-6 pr-14 py-4 bg-surface-container-low border rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${errors.password ? 'border-error focus:ring-error-container' : 'border-outline-variant focus:border-primary focus:ring-primary-container/30'}`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background cursor-pointer">
                      <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.password && <p className="text-error font-body-md text-xs mt-2">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-label-lg text-on-background mb-2">Confirm Password</label>
                  <input
                    type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    placeholder="••••••••" required
                    className={`w-full px-6 py-4 bg-surface-container-low border rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${errors.confirmPassword ? 'border-error focus:ring-error-container' : 'border-outline-variant focus:border-primary focus:ring-primary-container/30'}`}
                  />
                  {errors.confirmPassword && <p className="text-error font-body-md text-xs mt-2">{errors.confirmPassword}</p>}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block font-label-lg text-on-background mb-2">
                    Address <span className="font-body-md text-on-surface-variant/60 font-normal">(optional)</span>
                  </label>
                  <textarea
                    name="address" value={formData.address} onChange={handleChange}
                    rows={2} placeholder="Your address"
                    className="w-full px-6 py-4 bg-surface-container-low border border-outline-variant rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary-container/30 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 mb-8">
                <input type="checkbox" id="terms" required className="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" />
                <label htmlFor="terms" className="font-body-md text-on-surface-variant cursor-pointer leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:text-primary-container font-bold">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-primary hover:text-primary-container font-bold">Privacy Policy</Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-surface-tint text-on-primary font-label-lg text-[16px] py-4.5 rounded-full shadow-[0_10px_20px_rgba(40,108,0,0.2)] hover:-translate-y-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>Create Account <span className="material-symbols-outlined">arrow_forward</span></>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
