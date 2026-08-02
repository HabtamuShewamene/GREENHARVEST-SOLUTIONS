'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Product } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useCart } from '@/contexts/CartContext';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [reviewsData, setReviewsData] = useState<any>(null);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [addedSuccess, setAddedSuccess] = useState(false);
    const [buyingNow, setBuyingNow] = useState(false);
    const { showSuccess, showError } = useToast();
    const { addToCart, openCart, cart, clearCart } = useCart();

    // Review form state
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewError, setReviewError] = useState('');

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const [productRes, reviewsRes] = await Promise.all([
                    api.getProductById(id),
                    api.getProductReviews(id).catch(() => null)
                ]);
                setProduct(productRes.product);
                if (reviewsRes) {
                    setReviewsData(reviewsRes);
                }

                // Fetch related products from same farmer
                if (productRes.product?.farmer_id) {
                    try {
                        const related = await api.getProducts({ farmer_id: productRes.product.farmer_id, limit: 6 });
                        setRelatedProducts((related.products || []).filter((p: any) => p.id !== productRes.product.id).slice(0, 5));
                    } catch { /* silent */ }
                }
            } catch (err) {
                console.error("Failed to load product details", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleAddToCart = async () => {
        if (!product) return;
        setAddingToCart(true);
        try {
            await addToCart(product.id, quantity);
            setAddedSuccess(true);
            setTimeout(() => setAddedSuccess(false), 2000);
        } catch (err: any) {
            console.error("Failed to add to cart", err);
            showError(err?.response?.data?.message || "Failed to add to cart. Please try again.");
        } finally {
            setAddingToCart(false);
        }
    };

    const handleBuyNow = async () => {
        if (!product) return;
        setBuyingNow(true);
        try {
            await clearCart();
            await addToCart(product.id, quantity);
            router.push('/buyer/checkout'); // Redirect to checkout directly
        } catch (err: any) {
            console.error("Failed to add to cart for buy now", err);
            showError(err?.response?.data?.message || "Failed to process. Please try again.");
            setBuyingNow(false);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        setReviewError('');
        setIsSubmittingReview(true);
        try {
            await api.createReview({
                product_id: product.id,
                rating,
                comment: comment.trim() || undefined
            });
            // Refresh reviews
            const reviewsRes = await api.getProductReviews(id).catch(() => null);
            if (reviewsRes) {
                setReviewsData(reviewsRes);
            }
            setRating(5);
            setComment('');
            alert("Review submitted successfully!");
        } catch (err: any) {
            console.error("Failed to submit review", err);
            setReviewError(err?.response?.data?.message || "Failed to submit review. Have you already reviewed this product?");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const hasDiscount = product?.discount_price && Number(product.discount_price) > 0 && Number(product.discount_price) < Number(product.price);
    const discountPercent = hasDiscount ? Math.round((1 - Number(product!.discount_price) / Number(product!.price)) * 100) : 0;
    const displayPrice = hasDiscount ? Number(product!.discount_price) : (product ? Number(product.price) : 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#286c00] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-500 font-medium">Loading product...</span>
                </div>
            </div>
        );
    }

    if (!product) {
        return <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center text-[#6b7280]">Product not found.</div>;
    }

    return (
        <div className="bg-[#f9fafb] text-[#111827] font-sans antialiased transition-colors duration-300 min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-[#e5e7eb]">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <Link href="/buyer/dashboard" className="text-xl font-bold text-[#286c00] flex items-center gap-1.5">
                                <span className="material-symbols-outlined">eco</span> GreenHarvest
                            </Link>
                        </div>
                        <div className="flex-1 max-w-2xl px-8 hidden md:block">
                            <div className="relative">
                                <input className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-[#286c00] text-sm" placeholder="Search organic produce..." type="text"/>
                                <span className="material-symbols-outlined absolute right-3 top-2 text-[#6b7280] text-xl">search</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-6">
                            <Link href="/buyer/profile" className="text-gray-700 hover:text-[#286c00] transition-colors flex flex-col items-center">
                                <span className="material-symbols-outlined">person</span>
                                <span className="text-[10px] mt-0.5 font-medium">Account</span>
                            </Link>
                            <button onClick={openCart} className="text-gray-700 hover:text-[#286c00] transition-colors flex flex-col items-center relative cursor-pointer">
                                <span className="material-symbols-outlined">shopping_cart</span>
                                <span className="text-[10px] mt-0.5 font-medium">Cart</span>
                                {cart.length > 0 && (
                                    <span className="absolute top-0 right-0 w-4 h-4 bg-[#ff8296] text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white translate-x-1/2 -translate-y-1/2">{cart.length}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                {/* Breadcrumbs */}
                <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Link href="/" className="hover:underline">Home</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <Link href="/buyer/dashboard" className="hover:underline">{product.category_name || 'Produce'}</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-gray-900 font-medium">{product.name}</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Column (Main Content) */}
                    <div className="flex-1 w-full space-y-8">
                        
                        {/* Top Section: Images + Quick Info */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
                            {/* Images */}
                            <div className="flex gap-4 md:w-1/2">
                                <div className="flex flex-col gap-2 w-16 shrink-0">
                                    <div className="w-16 h-16 rounded-xl border-2 border-[#286c00] overflow-hidden cursor-pointer">
                                        {product.image_url ? (
                                            <img src={product.image_url} className="w-full h-full object-cover" alt="Thumb 1" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-gray-400">image</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 rounded-2xl overflow-hidden bg-gray-100 aspect-square border border-gray-100 relative">
                                    {product.image_url ? (
                                        <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-300 text-6xl">image</span>
                                        </div>
                                    )}
                                    {hasDiscount && (
                                        <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                                            🔥 {discountPercent}% OFF
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Info */}
                            <div className="md:w-1/2 space-y-5">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-snug">{product.name}</h1>
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="flex text-yellow-400">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <span key={i} className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                                            ))}
                                        </div>
                                        <span className="font-bold text-gray-900">{reviewsData?.average_rating ? Number(reviewsData.average_rating).toFixed(1) : "0.0"}</span>
                                        <a href="#reviews" className="text-gray-500 underline hover:text-[#286c00]">{reviewsData?.total_reviews || 0} Reviews</a>
                                    </div>
                                </div>

                                {/* Price Display */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                    {hasDiscount ? (
                                        <div className="flex items-end gap-3">
                                            <span className="text-3xl font-black text-[#286c00]">ETB {Number(product.discount_price).toFixed(2)}</span>
                                            <span className="text-lg text-gray-400 line-through font-medium mb-0.5">ETB {Number(product.price).toFixed(2)}</span>
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full mb-1">
                                                SAVE {discountPercent}%
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-3xl font-black text-[#286c00]">ETB {Number(product.price).toFixed(2)}</span>
                                    )}
                                    <p className="text-[10px] text-gray-500 mt-1">per unit • Tax excluded</p>
                                </div>

                                {/* Grid of info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Link href={`/buyer/farmer/${product.farmer_id}`} className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100 hover:border-[#286c00] hover:bg-green-50/50 transition-all cursor-pointer group">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">FARM</p>
                                        <p className="text-xs font-bold text-gray-900 leading-tight mb-0.5 group-hover:text-[#286c00] transition-colors flex items-center gap-1">
                                            {product.farmer_name || 'Partner Farm'}
                                            <span className="material-symbols-outlined text-[12px] text-gray-400 group-hover:text-[#286c00]">open_in_new</span>
                                        </p>
                                        <p className="text-[10px] text-gray-500">{product.farm_location || 'Local Region'}</p>
                                    </Link>
                                    <div className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">CATEGORY</p>
                                        <p className="text-xs font-bold text-gray-900 leading-tight mb-0.5">{product.category_name || 'General'}</p>
                                    </div>
                                    <div className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">STOCK</p>
                                        <p className={`text-xs font-bold leading-tight mb-0.5 ${product.stock > 50 ? 'text-green-600' : product.stock > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                                            {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                                        </p>
                                    </div>
                                    <div className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">LISTED</p>
                                        <p className="text-xs font-bold text-gray-900 leading-tight mb-0.5">
                                            {product.created_at ? new Date(product.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Product Description</h3>
                            <p className="text-gray-600 text-[13px] leading-relaxed">
                                {product.description || 'No description provided for this product.'}
                            </p>
                        </div>

                        {/* Farmer Profile Card */}
                        <Link href={`/buyer/farmer/${product.farmer_id}`} className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#286c00] hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#286c00] to-[#4caf50] flex items-center justify-center text-white font-bold text-xl shrink-0">
                                    {(product.farmer_name || 'F').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#286c00] transition-colors flex items-center gap-1.5">
                                        {product.farmer_name || 'Partner Farm'}
                                        <span className="material-symbols-outlined text-[14px] text-[#286c00]">verified</span>
                                    </h3>
                                    <p className="text-xs text-gray-500">{product.farm_location || 'Local Region'} • GreenHarvest Verified Farmer</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[#286c00] font-bold">
                                    Visit Store <span className="material-symbols-outlined text-[16px]">storefront</span>
                                </div>
                            </div>
                        </Link>

                        {/* Customer Reviews */}
                        <div id="reviews" className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-800 text-xl">reviews</span>
                                Customer Reviews ({reviewsData?.total_reviews || 0})
                            </h3>

                            <div className="flex flex-wrap items-center gap-4 mb-8">
                                <span className="text-4xl font-bold text-gray-900">{reviewsData?.average_rating ? Number(reviewsData.average_rating).toFixed(1) : "0.0"}</span>
                                <div className="flex text-yellow-400">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                                    ))}
                                </div>
                                <span className="text-sm text-gray-500 font-medium">{reviewsData?.total_reviews || 0} ratings</span>
                            </div>

                            <div className="space-y-6">
                                {!reviewsData?.reviews || reviewsData.reviews.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No reviews yet. Be the first to review this product!</p>
                                ) : (
                                    reviewsData.reviews.map((review: any) => (
                                        <div key={review.id || review.review_id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                                    {(review.user_name || review.name || 'U').charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex text-yellow-400 text-[10px] mb-1">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <span key={i} className={`material-symbols-outlined text-[12px] ${i < review.rating ? '' : 'text-gray-200'}`} style={{ fontVariationSettings: i < review.rating ? '"FILL" 1' : '"FILL" 0' }}>star</span>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-900 mb-2 leading-relaxed">{review.comment || 'No comment provided.'}</p>
                                                    <span className="text-[10px] text-gray-500">
                                                        {(review.user_name || review.name || 'Anonymous').substring(0, 4)}*** | {review.created_at ? new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add Review Form */}
                            <div className="mt-10 pt-8 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-900 mb-4">Write a Review</h4>
                                {reviewError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">
                                        {reviewError}
                                    </div>
                                )}
                                <form onSubmit={handleSubmitReview} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2">Rating</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className={`material-symbols-outlined text-3xl transition-colors cursor-pointer ${star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
                                                    style={{ fontVariationSettings: star <= rating ? '"FILL" 1' : '"FILL" 0' }}
                                                >
                                                    star
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2">Your Review (Optional)</label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            rows={3}
                                            placeholder="What did you think of this product?"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#286c00] focus:border-transparent text-sm resize-none"
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingReview}
                                        className="bg-[#286c00] hover:bg-[#1e5200] text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm disabled:opacity-50"
                                    >
                                        {isSubmittingReview ? "Submitting..." : "Submit Review"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* More from this Farmer */}
                        {relatedProducts.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#286c00]">storefront</span>
                                        More from {product.farmer_name || 'this Farmer'}
                                    </h3>
                                    <Link href={`/buyer/farmer/${product.farmer_id}`} className="text-xs font-bold text-[#286c00] hover:underline flex items-center gap-1">
                                        View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </Link>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {relatedProducts.map((rp: any) => {
                                        const rpHasDiscount = rp.discount_price && Number(rp.discount_price) > 0 && Number(rp.discount_price) < Number(rp.price);
                                        const rpDiscountPercent = rpHasDiscount ? Math.round((1 - Number(rp.discount_price) / Number(rp.price)) * 100) : 0;
                                        return (
                                            <Link key={rp.id} href={`/buyer/product/${rp.id}`} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#286c00]/30 transition-all group">
                                                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                                                    {rp.image_url ? (
                                                        <img src={rp.image_url} alt={rp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-gray-300 text-4xl">image</span>
                                                        </div>
                                                    )}
                                                    {rpHasDiscount && (
                                                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                                            -{rpDiscountPercent}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">{rp.name}</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        {rpHasDiscount ? (
                                                            <>
                                                                <span className="text-sm font-black text-[#286c00]">ETB {Number(rp.discount_price).toFixed(0)}</span>
                                                                <span className="text-[10px] text-gray-400 line-through">ETB {Number(rp.price).toFixed(0)}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-sm font-black text-[#286c00]">ETB {Number(rp.price).toFixed(0)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Sticky Sidebar) */}
                    <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 lg:sticky lg:top-24">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-5">
                            {/* Price */}
                            <div>
                                {hasDiscount ? (
                                    <div>
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-3xl font-black text-[#e3342f]">ETB {Number(product.discount_price).toFixed(2)}</span>
                                            <span className="text-sm text-gray-400 line-through">ETB {Number(product.price).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                🔥 FLASH SALE - {discountPercent}% OFF
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-1 mb-0.5">
                                        <span className="text-3xl font-black text-[#286c00]">ETB {Number(product.price).toFixed(2)}</span>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-500 mt-1">Tax excluded, calculated at checkout</p>
                            </div>

                            {/* Farm Direct */}
                            <div className="flex items-center justify-between text-xs pb-1 border-t border-gray-100 pt-3">
                                <span className="text-gray-500">Farm Direct</span>
                                <Link href={`/buyer/farmer/${product.farmer_id}`} className="font-bold text-gray-700 flex items-center hover:text-[#286c00] transition-colors">
                                    {product.farmer_name || 'Partner Farm'} <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                </Link>
                            </div>

                            {/* Freshness Commitment */}
                            <div className="bg-[#f9fafb] p-3.5 rounded-xl space-y-3 border border-gray-50">
                                <p className="text-xs font-bold text-[#286c00]">Freshness Commitment</p>
                                <div className="space-y-2.5">
                                    <div className="flex gap-2.5">
                                        <span className="material-symbols-outlined text-[#286c00] text-[16px] mt-0.5">local_shipping</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-900">Fast Delivery</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Direct from farm to your door</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <span className="material-symbols-outlined text-[#286c00] text-[16px]">replay</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-900">Quality Guarantee</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <span className="material-symbols-outlined text-[#286c00] text-[16px] mt-0.5">verified_user</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-900">Secure Payments</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Encrypted processing.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity */}
                            <div>
                                <p className="text-xs font-bold text-gray-900 mb-2">Quantity</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border border-gray-200 rounded-lg p-0.5 w-24 bg-white shadow-sm">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-50 text-gray-600"><span className="material-symbols-outlined text-sm">remove</span></button>
                                        <input type="text" readOnly value={quantity} className="w-full text-center border-none text-xs font-bold focus:ring-0 p-0" />
                                        <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-50 text-gray-600"><span className="material-symbols-outlined text-sm">add</span></button>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-500">{product.stock}+ available</span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</span>
                                    <span className="font-black text-gray-900">ETB {(displayPrice * quantity).toFixed(2)}</span>
                                </div>
                                {hasDiscount && (
                                    <div className="flex justify-between items-center text-xs mt-1">
                                        <span className="text-green-600 font-medium">You save</span>
                                        <span className="text-green-600 font-bold">ETB {((Number(product.price) - Number(product.discount_price!)) * quantity).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions - AliExpress Inspired */}
                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={handleAddToCart} 
                                    disabled={addingToCart || addedSuccess} 
                                    className={`flex-1 font-bold py-3 px-2 rounded-full transition-all text-sm shadow-md flex items-center justify-center gap-1.5 ${
                                        addedSuccess 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gradient-to-r from-[#ff8900] to-[#ff5d00] hover:from-[#ff9900] hover:to-[#ff6d00] text-white'
                                    }`}
                                >
                                    {addingToCart ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : addedSuccess ? (
                                        <><span className="material-symbols-outlined text-[18px]">check_circle</span> Added</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-[18px]">add_shopping_cart</span> Add to cart</>
                                    )}
                                </button>
                                <button 
                                    onClick={handleBuyNow} 
                                    disabled={buyingNow} 
                                    className="flex-1 bg-gradient-to-r from-[#ff0000] to-[#d60000] hover:from-[#ff1a1a] hover:to-[#e60000] text-white font-bold py-3 px-2 rounded-full transition-all text-sm shadow-md flex items-center justify-center"
                                >
                                    {buyingNow ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        "Buy now"
                                    )}
                                </button>
                            </div>

                            {/* Share / Like */}
                            <div className="flex gap-2.5 mt-1">
                                <button className="flex-1 py-2 border border-gray-200 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-gray-500">share</span> Share
                                </button>
                                <button className="flex-1 py-2 border border-gray-200 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-gray-500">favorite_border</span> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
