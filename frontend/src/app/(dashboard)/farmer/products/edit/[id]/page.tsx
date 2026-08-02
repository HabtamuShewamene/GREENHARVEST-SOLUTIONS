'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { showError, showSuccess } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
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
    discount_price: '',
    imageUrl: '',
    imagePublicId: '',
    imagePreview: '',
  });

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productRes, categoriesRes] = await Promise.all([
        api.getProductById(productId),
        api.getCategories()
      ]);

      const product = productRes.product;
      setCategories(categoriesRes.categories || []);

      setFormData({
        name: product.name || '',
        category_id: product.category_id?.toString() || '',
        harvestDate: '', // not implemented in backend yet
        description: product.description || '',
        price: product.price?.toString() || '',
        unit: 'kg', // default
        stock: product.stock?.toString() || '',
        discount_price: product.discount_price?.toString() || '',
        imageUrl: product.image_url || '',
        imagePublicId: '', // Would need to parse from URL if possible, but leaving empty is fine for edit unless deleting
        imagePreview: product.image_url || '',
      });

    } catch (error) {
      console.error("Failed to load data", error);
      setSubmitError("Failed to load product details.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

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
      setFormData((prev) => ({ ...prev, imagePreview: prev.imageUrl })); // Revert preview to old URL
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
      } catch { /* silent */ }
    }
    setFormData((prev) => ({
      ...prev,
      imageUrl: '',
      imagePublicId: '',
      imagePreview: '',
    }));
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    
    try {
      await api.updateProduct(productId, {
        name: formData.name,
        description: formData.description || undefined,
        price: Number(formData.price),
        discount_price: formData.discount_price ? Number(formData.discount_price) : null,
        stock: Number(formData.stock),
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        image_url: formData.imageUrl || undefined,
      });
      showSuccess('Product updated successfully!');
      router.push('/farmer/products');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update product. Please try again.';
      setSubmitError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9fafb]">
        <div className="w-12 h-12 border-4 border-[#2d9a33] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto w-full">
        <div className="flex justify-between items-center p-8 sticky top-0 bg-[#fafafa]/90 backdrop-blur-md z-10 border-b border-gray-100">
          <Link
            href="/farmer/products"
            className="flex items-center text-gray-500 hover:text-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            <span className="font-bold">Back to Products</span>
          </Link>
          <h1 className="text-xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
            Edit Product
          </h1>
          <div className="w-24"></div> {/* spacer */}
        </div>

        <div className="max-w-3xl mx-auto py-12 px-8 pb-32">
          
          <form onSubmit={submitProduct} className="space-y-10">
            {submitError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-2">
                <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
                <p className="text-sm text-red-700 font-medium">{submitError}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2d9a33]">info</span>
                Basic Information
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Category</label>
                    <div className="relative">
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all text-gray-900 font-medium appearance-none cursor-pointer"
                      >
                        <option value="">Select a category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Harvest Date
                    </label>
                    <input
                      type="date"
                      name="harvestDate"
                      value={formData.harvestDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all text-gray-900 font-medium resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing and Inventory */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2d9a33]">sell</span>
                Pricing & Inventory
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Price (ETB) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      required
                      className="w-full pl-8 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Unit</label>
                  <div className="relative">
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all text-gray-900 font-medium appearance-none cursor-pointer"
                    >
                      <option value="kg">per Kg</option>
                      <option value="box">per Box</option>
                      <option value="bunch">per Bunch</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Stock Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    min="0"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900"
                  />
                </div>

                {/* Discount Price */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Discount Price (ETB) <span className="text-gray-400 font-normal text-xs">Optional</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="discount_price"
                      value={formData.discount_price}
                      onChange={handleChange}
                      placeholder="Leave blank for no discount"
                      min="0.01"
                      step="0.01"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900"
                    />
                    {formData.discount_price && formData.price && Number(formData.discount_price) < Number(formData.price) && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                        {Math.round((1 - Number(formData.discount_price) / Number(formData.price)) * 100)}% OFF
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Product Image */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2d9a33]">image</span>
                Product Image
              </h2>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
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
                        <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20">
                            <span className="material-symbols-outlined animate-spin text-white text-[40px]">refresh</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-[#2d9a33] group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
                        </div>
                        <p className="font-bold text-gray-800">Upload new photo</p>
                      </>
                    )}
                  </div>
                  {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
                </div>

                <div className="w-full md:w-64 flex flex-col justify-end space-y-4">
                  {formData.imagePreview && !isUploading && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="w-full py-3 px-4 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
                    >
                      Remove Photo
                    </button>
                  )}
                  <p className="text-sm text-gray-500">
                    Recommended size: 800x800px. High quality images attract more buyers.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Link
                href="/farmer/products"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-8 py-3 bg-[#2d9a33] text-white font-bold rounded-xl hover:bg-[#25822a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <><span className="material-symbols-outlined animate-spin">refresh</span> Saving...</>
                ) : (
                  <><span className="material-symbols-outlined">save</span> Save Changes</>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </>
  );
}
