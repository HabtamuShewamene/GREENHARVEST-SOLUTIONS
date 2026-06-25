'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { validateProductStep, validateProductForm } from '@/lib/validations/product';
import { useToast } from '@/contexts/ToastContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function NewProductPage() {
  const router = useRouter();
  const { showError } = useToast();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    harvestDate: '',
    description: '',
    price: '',
    unit: 'kg',
    stock: '',
    imageUrl: '',        // Cloudinary URL returned after upload
    imagePublicId: '',   // Cloudinary public_id (for deletion)
    imagePreview: '',    // Local object URL just for preview
  });

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return { Authorization: `Bearer ${token}` };
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ------------------------------------------------------------------ */
  /*  Step 3: Image upload → Cloudinary (via backend)                    */
  /* ------------------------------------------------------------------ */

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // Show local preview immediately
    const preview = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, imagePreview: preview }));
    setUploadError('');
    setIsUploading(true);

    try {
      const body = new FormData();
      body.append('image', file);

      const { data } = await axios.post(`${API}/upload/product-image`, body, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });

      setFormData((prev) => ({
        ...prev,
        imageUrl: data.url,
        imagePublicId: data.public_id,
      }));
    } catch (err: any) {
      setUploadError('Image upload failed. Please try again.');
      setFormData((prev) => ({ ...prev, imagePreview: '' }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (formData.imagePublicId) {
      try {
        await axios.delete(`${API}/upload/product-image`, {
          data: { public_id: formData.imagePublicId },
          headers: getAuthHeaders(),
        });
      } catch { /* silent – image still removed on UI side */ }
    }
    setFormData((prev) => ({
      ...prev,
      imageUrl: '',
      imagePublicId: '',
      imagePreview: '',
    }));
  };

  /* ------------------------------------------------------------------ */
  /*  Final submission: create the product record                        */
  /* ------------------------------------------------------------------ */

  const submitProduct = async () => {
    setSubmitError('');
    const validationError = validateProductForm(formData);
    if (validationError) {
      setSubmitError(validationError);
      showError(validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API}/products`,
        {
          name: formData.name,
          description: formData.description || undefined,
          price: Number(formData.price),
          stock: Number(formData.stock),
          category_id: formData.category_id ? Number(formData.category_id) : undefined,
          image_url: formData.imageUrl || undefined,
        },
        { headers: getAuthHeaders() }
      );
      router.push('/farmer/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create product. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Navigation guards                                                   */
  /* ------------------------------------------------------------------ */

  const handleNext = () => {
    setSubmitError('');
    const stepError = validateProductStep(step, formData);
    if (stepError) {
      setSubmitError(stepError);
      showError(stepError);
      return;
    }
    if (step < 4) setStep(step + 1);
    else submitProduct();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.push('/farmer/dashboard');
  };

  const progressWidths: Record<number, string> = {
    1: 'w-1/4',
    2: 'w-2/4',
    3: 'w-3/4',
    4: 'w-full',
  };

  const nextDisabled =
    isSubmitting ||
    isUploading ||
    (step === 1 && !formData.name) ||
    (step === 2 && (!formData.price || !formData.stock)) ||
    (step === 3 && isUploading);

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <>
      {/* LEFT COLUMN – hero image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <img
          src="/farmer-hero-new.png"
          alt="Ethiopian Farmer"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-16 left-12 right-12 text-white">
          <h1
            className="text-6xl font-black mb-6 tracking-tighter leading-[0.95] uppercase"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Share your harvest<br />with the world.
          </h1>
          <p className="text-lg text-gray-200 font-medium max-w-md leading-relaxed">
            Join thousands of farmers reaching new buyers every day with high-quality,
            transparent listings.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN – form */}
      <div className="w-full lg:w-1/2 flex flex-col relative h-full">
        {/* Top nav */}
        <div className="flex justify-between items-center p-8 absolute top-0 w-full z-10 bg-gradient-to-b from-[#fafafa] to-transparent">
          <Link
            href="/farmer/dashboard"
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-800">close</span>
          </Link>
          <button className="text-sm font-bold text-gray-900 hover:underline">
            Save &amp; exit
          </button>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto px-8 sm:px-16 lg:px-24 flex flex-col justify-center pb-32">
          <div className="max-w-md w-full mx-auto pt-24">
            <p className="text-sm text-gray-500 font-medium mb-4">Step {step} of 4</p>

            {/* ── STEP 1: Basic info ── */}
            {step === 1 && (
              <div>
                <h2
                  className="text-5xl font-black text-gray-900 mb-12 tracking-tighter leading-[0.95] uppercase"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  Tell us about your<br />product
                </h2>
                <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Organic Heirloom Tomatoes"
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a6810]/20 focus:border-[#2a6810] transition-all text-gray-900 font-medium placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Category</label>
                    <div className="relative">
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a6810]/20 focus:border-[#2a6810] transition-all text-gray-900 font-medium appearance-none cursor-pointer"
                      >
                        <option value="">Select a category</option>
                        <option value="1">Vegetables</option>
                        <option value="2">Fruits</option>
                        <option value="3">Grains &amp; Cereals</option>
                        <option value="4">Dairy</option>
                        <option value="5">Meat &amp; Poultry</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Expected Harvest Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="harvestDate"
                        value={formData.harvestDate}
                        onChange={handleChange}
                        className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a6810]/20 focus:border-[#2a6810] transition-all text-gray-900 font-medium appearance-none"
                      />
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 2: Pricing & stock ── */}
            {step === 2 && (
              <div>
                <h2
                  className="text-5xl font-black text-gray-900 mb-12 tracking-tighter leading-[0.95] uppercase"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  Set your pricing<br />&amp; details
                </h2>
                <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Describe your product's quality, farming method, etc."
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a6810]/20 focus:border-[#2a6810] transition-all text-gray-900 font-medium placeholder-gray-400 resize-none"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Price (ETB) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a6810]/20 focus:border-[#2a6810] transition-all text-gray-900 font-medium placeholder-gray-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-900 mb-2">Unit</label>
                      <div className="relative">
                        <select
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a6810]/20 focus:border-[#2a6810] transition-all text-gray-900 font-medium appearance-none cursor-pointer"
                        >
                          <option value="kg">per Kg</option>
                          <option value="box">per Box</option>
                          <option value="bunch">per Bunch</option>
                          <option value="piece">per Piece</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Available Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      placeholder={`How many ${formData.unit}s do you have?`}
                      min="1"
                      className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a6810]/20 focus:border-[#2a6810] transition-all text-gray-900 font-medium placeholder-gray-400"
                    />
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 3: Photo upload ── */}
            {step === 3 && (
              <div>
                <h2
                  className="text-5xl font-black text-gray-900 mb-12 tracking-tighter leading-[0.95] uppercase"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  Show off your<br />harvest
                </h2>
                <div className="space-y-6">
                  <p className="text-sm text-gray-600 font-medium">
                    Upload a clear, bright photo of your produce to attract buyers.
                    The image is instantly stored on Cloudinary.
                  </p>

                  {/* Drop zone */}
                  <div className="relative w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {formData.imagePreview ? (
                      <>
                        <img
                          src={formData.imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        {/* Upload spinner overlay */}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20">
                            <span className="material-symbols-outlined animate-spin text-white text-[40px]">
                              refresh
                            </span>
                            <p className="text-white text-sm font-bold mt-2">Uploading to Cloudinary…</p>
                          </div>
                        )}
                        {/* Success badge */}
                        {!isUploading && formData.imageUrl && (
                          <div className="absolute top-3 right-3 bg-[#2a6810] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 z-20">
                            <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                            Uploaded
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-[#2a6810] group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
                        </div>
                        <p className="font-bold text-gray-800">Click to upload photo</p>
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, WebP — up to 5 MB</p>
                      </>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {uploadError}
                    </p>
                  )}

                  {formData.imagePreview && !isUploading && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleRemoveImage}
                        className="text-sm font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Remove photo
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    You can skip this step — you can add a photo later from your product settings.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review ── */}
            {step === 4 && (
              <div>
                <h2
                  className="text-5xl font-black text-gray-900 mb-12 tracking-tighter leading-[0.95] uppercase"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  Ready to go<br />live!
                </h2>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-4">
                  {/* Image preview */}
                  {formData.imageUrl && (
                    <div className="w-full h-44 rounded-xl overflow-hidden mb-6 relative">
                      <img
                        src={formData.imageUrl}
                        alt="Product"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
                        <span className="font-bold text-lg">{formData.name || 'Untitled'}</span>
                        <span className="font-bold bg-[#2a6810] px-2 py-1 rounded text-sm">
                          {formData.price || '0'} ETB/{formData.unit}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* No image fallback */}
                  {!formData.imageUrl && (
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl">
                          {formData.name || 'Untitled Product'}
                        </h3>
                        <p className="text-sm text-gray-500">No image provided</p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-xl text-[#2a6810]">
                          {formData.price || '0'} ETB
                        </span>
                        <span className="text-sm text-gray-500">per {formData.unit}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 text-sm mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Available Stock</span>
                      <span className="font-bold text-gray-900">
                        {formData.stock || '0'} {formData.unit}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Harvest Date</span>
                      <span className="font-bold text-gray-900">
                        {formData.harvestDate || 'Not specified'}
                      </span>
                    </div>
                    {formData.imageUrl && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Image Storage</span>
                        <span className="flex items-center gap-1 text-[#2a6810] font-bold text-xs">
                          <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                          Cloudinary
                        </span>
                      </div>
                    )}
                    {formData.description && (
                      <div className="pt-2">
                        <span className="text-gray-500 font-medium block mb-1">Description</span>
                        <p className="text-gray-900">{formData.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
                    <p className="text-sm text-red-700 font-medium">{submitError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="absolute bottom-0 w-full bg-[#fafafa]">
          <div className="w-full h-1 bg-gray-200">
            <div
              className={`h-full bg-[#2a6810] transition-all duration-500 ${progressWidths[step]}`}
            />
          </div>
          <div className="px-8 sm:px-16 py-6 flex justify-between items-center">
            <button
              onClick={handleBack}
              className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors underline decoration-2 underline-offset-4"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={nextDisabled}
              className={`px-10 py-3.5 ${
                nextDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#2a6810] hover:bg-[#1f4d0c]'
              } text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 min-w-[160px]`}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                  Publishing…
                </>
              ) : step === 4 ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  Publish Listing
                </>
              ) : (
                'Next'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
