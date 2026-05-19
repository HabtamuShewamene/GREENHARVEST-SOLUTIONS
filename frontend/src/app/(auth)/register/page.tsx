/**
 * Registration Page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Leaf, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import type { UserRole } from '@/types';

const roles = [
  {
    value: 'buyer' as UserRole,
    title: 'Buyer',
    description: 'Shop for fresh farm produce',
    emoji: '🛒',
    color: 'from-violet-50 to-purple-100',
    border: 'border-violet-200',
    active: 'border-violet-500 bg-violet-50 ring-2 ring-violet-200',
  },
  {
    value: 'farmer' as UserRole,
    title: 'Farmer',
    description: 'Sell your agricultural products',
    emoji: '🌾',
    color: 'from-emerald-50 to-green-100',
    border: 'border-emerald-200',
    active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
  },
  {
    value: 'delivery' as UserRole,
    title: 'Delivery Partner',
    description: 'Deliver products to customers',
    emoji: '🚚',
    color: 'from-amber-50 to-yellow-100',
    border: 'border-amber-200',
    active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
  },
  {
    value: 'field_agent' as UserRole,
    title: 'Field Agent',
    description: 'Help farmers list products',
    emoji: '👨‍💼',
    color: 'from-sky-50 to-blue-100',
    border: 'border-sky-200',
    active: 'border-sky-500 bg-sky-50 ring-2 ring-sky-200',
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
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-stone-900 mb-2">Account Created!</h2>
          <p className="text-stone-500">Redirecting you to sign in...</p>
          <div className="mt-6 w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-[grow_2.5s_linear_forwards]" style={{ width: '100%', transformOrigin: 'left', animation: 'none', transition: 'width 2.5s linear' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg text-stone-900">
              Green<span className="text-violet-600">Harvest</span>
            </span>
          </Link>
          <h1 className="font-heading text-4xl font-bold text-stone-900 mb-2">Create your account</h1>
          <p className="text-stone-500">
            Already have one?{' '}
            <Link href="/login" className="text-violet-600 hover:text-violet-800 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {['Choose Role', 'Your Details'].map((label, i) => {
            const isActive = (i === 0 && step === 'role') || (i === 1 && step === 'details');
            const isDone = i === 0 && step === 'details';
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-500'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-stone-900' : 'text-stone-400'}`}>{label}</span>
                </div>
                {i === 0 && <div className={`w-12 h-0.5 rounded-full ${step === 'details' ? 'bg-emerald-400' : 'bg-stone-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1 — Role */}
        {step === 'role' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => { setSelectedRole(role.value); setStep('details'); }}
                  className={`group text-left p-6 rounded-3xl border-2 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg ${
                    selectedRole === role.value ? role.active : `bg-gradient-to-br ${role.color} ${role.border} hover:shadow-md`
                  }`}
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{role.emoji}</div>
                  <h3 className="font-heading font-bold text-stone-900 text-lg mb-1">{role.title}</h3>
                  <p className="text-stone-500 text-sm">{role.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 'details' && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
            <button
              onClick={() => setStep('role')}
              className="flex items-center gap-1.5 text-stone-500 hover:text-violet-600 text-sm font-medium mb-6 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Change role
            </button>

            <div className="flex items-center gap-3 mb-8 p-4 bg-stone-50 rounded-2xl">
              <span className="text-2xl">{roles.find(r => r.value === selectedRole)?.emoji}</span>
              <div>
                <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Registering as</p>
                <p className="font-semibold text-stone-900 capitalize">{selectedRole}</p>
              </div>
            </div>

            {errors.general && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Full Name</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder="John Doe" required
                    className={`w-full px-4 py-3 bg-stone-50 border rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 transition-all ${errors.name ? 'border-red-400 focus:ring-red-100' : 'border-stone-200 focus:border-violet-400 focus:ring-violet-100'}`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="you@example.com" required
                    className={`w-full px-4 py-3 bg-stone-50 border rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 transition-all ${errors.email ? 'border-red-400 focus:ring-red-100' : 'border-stone-200 focus:border-violet-400 focus:ring-violet-100'}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Phone</label>
                  <input
                    type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="+1 (555) 000-0000" required
                    className={`w-full px-4 py-3 bg-stone-50 border rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 transition-all ${errors.phone ? 'border-red-400 focus:ring-red-100' : 'border-stone-200 focus:border-violet-400 focus:ring-violet-100'}`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                      placeholder="Min. 8 characters" required
                      className={`w-full px-4 pr-10 py-3 bg-stone-50 border rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 transition-all ${errors.password ? 'border-red-400 focus:ring-red-100' : 'border-stone-200 focus:border-violet-400 focus:ring-violet-100'}`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    placeholder="••••••••" required
                    className={`w-full px-4 py-3 bg-stone-50 border rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 transition-all ${errors.confirmPassword ? 'border-red-400 focus:ring-red-100' : 'border-stone-200 focus:border-violet-400 focus:ring-violet-100'}`}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Address <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    name="address" value={formData.address} onChange={handleChange}
                    rows={2} placeholder="Your address"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input type="checkbox" id="terms" required className="mt-0.5 w-4 h-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500 cursor-pointer" />
                <label htmlFor="terms" className="text-sm text-stone-600 cursor-pointer leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-violet-600 hover:text-violet-800 font-medium">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-violet-600 hover:text-violet-800 font-medium">Privacy Policy</Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
