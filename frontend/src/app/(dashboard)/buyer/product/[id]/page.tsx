'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Product } from '@/types';
import { useParams, useRouter } from 'next/navigation';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [reviewsData, setReviewsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);

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
            await api.addToCart(product.id.toString(), quantity);
            alert("Added to cart successfully!");
        } catch (err) {
            console.error("Failed to add to cart", err);
            alert("Failed to add to cart. Please try again.");
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center text-[#10b981]">Loading product details...</div>;
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
                            <button className="text-gray-500 hover:text-gray-700">
                                <span className="material-symbols-outlined">menu</span>
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
                            <button onClick={() => router.push('/buyer/dashboard')} className="text-gray-700 hover:text-[#286c00] transition-colors flex flex-col items-center relative">
                                <span className="material-symbols-outlined">shopping_cart</span>
                                <span className="text-[10px] mt-0.5 font-medium">Cart</span>
                                <span className="absolute -top-1 -right-2 bg-[#286c00] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">3</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
                                        <img src={product.image_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCqisz_JYc32Ayzv3ehfaFG_nrxGalEE9V7b913H2B1Wzv6SZWKLgVWgab-hYGtDJu9T5qrAD9c14CjpzwJAP8TLxAj7Jeb9GW0L36qylWN12V67Fexbj0_yMRXo5lNddANueFYLG5YgngmokbHaQ03uP5zi6l-wY-O5RHRfTYZe8v3mfAQ-TYm4Jw9EbBov3TyETKxf6SxTK5TgolDmewNvls145dyFkAbRt1pZseTa0Caz9NfaVQ-P5IQYB8Dh_7k-wmT_QxH7-eg"} className="w-full h-full object-cover" alt="Thumb 1" />
                                    </div>
                                    <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:border-gray-400 opacity-80 hover:opacity-100">
                                        <div className="w-full h-full bg-black/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white/80">image</span>
                                        </div>
                                    </div>
                                    <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:border-gray-400 opacity-80 hover:opacity-100">
                                        <div className="w-full h-full bg-black/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white/80">image</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 rounded-2xl overflow-hidden bg-gray-100 aspect-square border border-gray-100">
                                    <img src={product.image_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCqisz_JYc32Ayzv3ehfaFG_nrxGalEE9V7b913H2B1Wzv6SZWKLgVWgab-hYGtDJu9T5qrAD9c14CjpzwJAP8TLxAj7Jeb9GW0L36qylWN12V67Fexbj0_yMRXo5lNddANueFYLG5YgngmokbHaQ03uP5zi6l-wY-O5RHRfTYZe8v3mfAQ-TYm4Jw9EbBov3TyETKxf6SxTK5TgolDmewNvls145dyFkAbRt1pZseTa0Caz9NfaVQ-P5IQYB8Dh_7k-wmT_QxH7-eg"} className="w-full h-full object-cover" alt={product.name} />
                                </div>
                            </div>

                            {/* Quick Info */}
                            <div className="md:w-1/2 space-y-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-snug">{product.name}</h1>
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="flex text-yellow-400">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <span key={i} className="material-symbols-outlined text-[14px]">star</span>
                                            ))}
                                        </div>
                                        <span className="font-bold text-gray-900">{reviewsData?.average_rating ? Number(reviewsData.average_rating).toFixed(1) : "0.0"}</span>
                                        <a href="#reviews" className="text-gray-500 underline hover:text-[#286c00]">{reviewsData?.total_reviews || 0} Reviews</a>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-gray-500">500+ sold this week</span>
                                    </div>
                                </div>

                                {/* Grid of info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">FARM</p>
                                        <p className="text-xs font-bold text-gray-900 leading-tight mb-0.5">{product.farmer_name || 'Partner Farm'}</p>
                                        <p className="text-[10px] text-gray-500">{product.farm_location || 'Local Region'}</p>
                                    </div>
                                    <div className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">HARVEST DATE</p>
                                        <p className="text-xs font-bold text-gray-900 leading-tight mb-0.5">Recently</p>
                                        <p className="text-[10px] text-gray-500">(2 days ago)</p>
                                    </div>
                                    <div className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">CERTIFICATIONS</p>
                                        <p className="text-xs font-bold text-gray-900 flex items-center gap-1 mt-1">
                                            <span className="material-symbols-outlined text-[#286c00] text-[14px]">check_circle</span> USDA Organic
                                        </p>
                                    </div>
                                    <div className="bg-[#f9fafb] p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">PESTICIDES</p>
                                        <p className="text-xs font-bold text-gray-900 mt-1">None used</p>
                                    </div>
                                </div>

                                {/* Variants */}
                                <div>
                                    <p className="text-xs font-medium text-gray-900 mb-2">Select Variant:</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button className="px-3 py-1.5 rounded-md border-2 border-[#286c00] text-[#286c00] bg-green-50/50 font-bold text-xs">1 kg (Approx. 3-4)</button>
                                        <button className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:border-gray-300 font-medium text-xs">2 kg</button>
                                        <button className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:border-gray-300 font-medium text-xs">5 kg (Bulk)</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 gap-6">
                            <button className="pb-3 border-b-2 border-[#286c00] text-[#286c00] font-bold text-xs">Overview & Nutrition</button>
                            <button className="pb-3 border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium text-xs">Traceability Map</button>
                            <button className="pb-3 border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium text-xs flex items-center gap-1.5">
                                Customer Reviews <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{reviewsData?.total_reviews || 0}</span>
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3">Product Description</h3>
                                <p className="text-gray-600 text-[13px] leading-relaxed mb-8">{product.description || 'These vibrant, juicy organic produce are grown under the sun. Known for their complex flavors and perfect textures, they are ideal for your next meal.'}</p>
                                
                                <h3 className="text-sm font-bold text-gray-900 mb-3">Why GreenHarvest?</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-[#f9fafb] border-b border-gray-200 text-gray-500">
                                            <tr>
                                                <th className="px-4 py-2.5 font-medium">Metric</th>
                                                <th className="px-4 py-2.5 font-bold text-[#286c00]">GreenHarvest</th>
                                                <th className="px-4 py-2.5 font-medium">Typical Store</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            <tr>
                                                <td className="px-4 py-3 text-gray-600">Time to Door</td>
                                                <td className="px-4 py-3 text-gray-900 font-bold">2-3 Days</td>
                                                <td className="px-4 py-3 text-gray-500">7-14 Days</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 text-gray-600">Farmer Payout</td>
                                                <td className="px-4 py-3 text-gray-900 font-bold">80%</td>
                                                <td className="px-4 py-3 text-gray-500">~15%</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 text-gray-600">Ripening</td>
                                                <td className="px-4 py-3 text-gray-900 font-bold">Vine-ripened</td>
                                                <td className="px-4 py-3 text-gray-500">Gas-ripened</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Nutritional Facts */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3">Nutritional Facts</h3>
                                <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm font-sans max-w-sm">
                                    <h4 className="font-black text-2xl border-b-[6px] border-black pb-1 mb-2 tracking-tight">Nutrition Facts</h4>
                                    <div className="flex justify-between border-b-4 border-black pb-1 mb-2 text-xs">
                                        <span className="font-bold">Serving size: 1 medium (148g)</span>
                                        <span className="font-bold text-right">Amount per serving</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b-4 border-black pb-1 mb-2">
                                        <span className="font-black text-xl">Calories</span>
                                        <span className="font-black text-3xl leading-none">25</span>
                                    </div>
                                    <p className="text-right text-[10px] font-bold border-b border-gray-300 pb-1 mb-1">% Daily Value*</p>
                                    <div className="flex justify-between border-b border-gray-300 pb-1 mb-1 text-xs">
                                        <span><span className="font-bold">Total Fat</span> 0g</span>
                                        <span className="font-bold">0%</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-300 pb-1 mb-1 text-xs">
                                        <span><span className="font-bold">Sodium</span> 5mg</span>
                                        <span className="font-bold">0%</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-300 pb-1 mb-1 text-xs">
                                        <span><span className="font-bold">Total Carbohydrate</span> 5g</span>
                                        <span className="font-bold">2%</span>
                                    </div>
                                    <div className="pl-4 flex justify-between border-b border-gray-300 pb-1 mb-1 text-xs">
                                        <span>Dietary Fiber 1g</span>
                                        <span>4%</span>
                                    </div>
                                    <div className="pl-4 flex justify-between border-b-4 border-black pb-1 mb-2 text-xs">
                                        <span>Total Sugars 3g</span>
                                        <span></span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-300 pb-1 mb-2 text-xs">
                                        <span><span className="font-bold">Protein</span> 1g</span>
                                        <span></span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-tight">High in Vitamin C (20% DV) and essential nutrients.</p>
                                </div>
                            </div>
                        </div>

                        {/* Journey: Farm to Plate */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-6">Journey: Farm to Plate</h3>
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-white bg-[#286c00] text-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        <span className="material-symbols-outlined text-sm">eco</span>
                                    </div>
                                    <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                        <h4 className="font-bold text-gray-900 text-xs mb-0.5">Planted & Grown</h4>
                                        <p className="text-[10px] text-gray-500 mb-2">{product.farmer_name || 'Partner Farm'}</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">Grown using sustainable, mineral-rich soil and drip irrigation to conserve water.</p>
                                    </div>
                                </div>
                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-white bg-[#286c00] text-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        <span className="material-symbols-outlined text-sm">local_florist</span>
                                    </div>
                                    <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                        <h4 className="font-bold text-gray-900 text-xs mb-0.5">Harvested</h4>
                                        <p className="text-[10px] text-gray-500 mb-2">Recently</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">Hand-picked at peak ripeness to ensure maximum flavor and nutrient density.</p>
                                    </div>
                                </div>
                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-white bg-blue-500 text-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        <span className="material-symbols-outlined text-sm">local_shipping</span>
                                    </div>
                                    <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-blue-100 bg-blue-50 shadow-sm">
                                        <h4 className="font-bold text-blue-900 text-xs mb-0.5">In Transit to Local Hub</h4>
                                        <p className="text-[10px] text-blue-600 mb-2 font-medium">Currently in progress</p>
                                        <p className="text-xs text-blue-800 leading-relaxed">Transported in climate-controlled eco-vans directly to our regional distribution center.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer Reviews */}
                        <div id="reviews" className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-6">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-800 text-xl">location_on</span> Customer Reviews ({reviewsData?.total_reviews || 0})
                                </h3>
                                <div className="text-xs text-gray-500 flex flex-wrap gap-4 font-medium">
                                    <span className="hover:text-gray-900 cursor-pointer">Specifications</span>
                                    <span className="hover:text-gray-900 cursor-pointer">Description</span>
                                    <span className="hover:text-gray-900 cursor-pointer">Farm Info</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mb-8">
                                <span className="text-4xl font-bold text-gray-900">{reviewsData?.average_rating ? Number(reviewsData.average_rating).toFixed(1) : "0.0"}</span>
                                <div className="flex text-yellow-400">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className="material-symbols-outlined">star</span>
                                    ))}
                                </div>
                                <span className="text-sm text-gray-500 font-medium">{reviewsData?.total_reviews || 0} ratings</span>
                                <span className="text-[#286c00] flex items-center gap-1 text-xs font-bold ml-auto sm:ml-4">
                                    <span className="material-symbols-outlined text-[14px]">check</span> All from verified purchases
                                </span>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <button className="border border-gray-200 bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-50">
                                    Sort by default <span className="material-symbols-outlined text-[14px]">expand_more</span>
                                </button>
                                <button className="text-[#286c00] text-xs font-medium hover:underline">Show original language</button>
                            </div>

                            {/* Review List */}
                            <div className="space-y-6">
                                {!reviewsData?.reviews || reviewsData.reviews.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No reviews yet.</p>
                                ) : (
                                    reviewsData.reviews.map((review: any) => (
                                        <div key={review.id || review.review_id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                                    {(review.user_name || review.name || 'U').charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div>
                                                            <div className="flex text-yellow-400 text-[10px] mb-0.5">
                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                    <span key={i} className={`material-symbols-outlined text-[12px] ${i < review.rating ? '' : 'text-gray-200'}`}>star</span>
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] text-gray-500">Variant: 1 kg</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-900 mt-2 mb-3 leading-relaxed">{review.comment || 'No comment provided.'}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                                        <span>
                                                            {(review.user_name || review.name || 'Anonymous User').substring(0, 4)}*** | {review.created_at ? new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <button className="flex items-center gap-1 hover:text-gray-800 transition-colors font-medium">
                                                                <span className="material-symbols-outlined text-[14px]">thumb_up_off_alt</span> Helpful (0)
                                                            </button>
                                                            <button className="hover:text-gray-800 transition-colors">
                                                                <span className="material-symbols-outlined text-[14px]">more_horiz</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="mt-6 text-center">
                                <button className="px-6 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                    View more
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Sticky Sidebar) */}
                    <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 lg:sticky lg:top-24">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-5">
                            <div>
                                <div className="flex items-baseline gap-1 mb-0.5">
                                    <span className="text-3xl font-black text-[#e3342f]">${Number(product.price).toFixed(2)}</span>
                                    <span className="text-xs font-medium text-[#e3342f]">/ kg</span>
                                </div>
                                <p className="text-[10px] text-gray-500">Tax excluded, calculated at checkout</p>
                            </div>

                            <div className="flex items-center justify-between py-2.5 border-y border-gray-100 text-xs">
                                <span className="text-gray-500">Variant: <span className="font-bold text-gray-900">1 kg</span></span>
                                <button className="text-[#286c00] hover:underline font-medium">Edit</button>
                            </div>

                            <div className="flex items-center justify-between text-xs pb-1">
                                <span className="text-gray-500">Farm Direct</span>
                                <Link href="#" className="font-bold text-gray-700 flex items-center hover:text-gray-900">{product.farmer_name || 'Partner Farm'} <span className="material-symbols-outlined text-[14px]">chevron_right</span></Link>
                            </div>

                            {/* Freshness Commitment */}
                            <div className="bg-[#f9fafb] p-3.5 rounded-xl space-y-3 border border-gray-50">
                                <p className="text-xs font-bold text-[#286c00]">Freshness Commitment</p>
                                <div className="space-y-2.5">
                                    <div className="flex gap-2.5">
                                        <span className="material-symbols-outlined text-[#286c00] text-[16px] mt-0.5">local_shipping</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-bold text-gray-900">Delivery: $2.99</p>
                                                <span className="material-symbols-outlined text-gray-400 text-[14px]">chevron_right</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">ETA: <span className="font-bold text-gray-800">Tomorrow</span>, order within 4 hrs</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <span className="material-symbols-outlined text-[#286c00] text-[16px]">replay</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-bold text-gray-900">Quality Guarantee</p>
                                                <span className="material-symbols-outlined text-gray-400 text-[14px]">chevron_right</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <span className="material-symbols-outlined text-[#286c00] text-[16px] mt-0.5">verified_user</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-bold text-gray-900">Secure Payments</p>
                                                <span className="material-symbols-outlined text-gray-400 text-[14px]">chevron_right</span>
                                            </div>
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

                            {/* Actions */}
                            <div className="space-y-2.5 pt-1">
                                <button className="w-full bg-[#e3342f] hover:bg-[#cc1f1a] text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm">
                                    Buy now
                                </button>
                                <button onClick={handleAddToCart} disabled={addingToCart} className="w-full bg-[#286c00] hover:bg-[#1e5200] text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm">
                                    {addingToCart ? "Adding..." : "Add to cart"}
                                </button>
                            </div>

                            {/* Share / Like */}
                            <div className="flex gap-2.5 mt-1">
                                <button className="flex-1 py-2 border border-gray-200 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-gray-500">share</span> Share
                                </button>
                                <button className="flex-1 py-2 border border-gray-200 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-gray-500">favorite_border</span> 1.2k
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
