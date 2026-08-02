/**
 * ProductCard Component
 */

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Star, MapPin } from 'lucide-react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) onAddToCart(product.id);
  };

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group bg-white rounded-3xl border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full flex flex-col cursor-pointer">

        {/* Image */}
        <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500 select-none">
              🥦
            </div>
          )}

          {/* Stock badge */}
          {isOutOfStock && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          )}
          {isLowStock && (
            <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
              Only {product.stock} left
            </span>
          )}

          {/* Quick-add overlay on hover */}
          {!isOutOfStock && (
            <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-3">
              <button
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-2xl transition-colors shadow-lg"
              >
                <ShoppingCart className="w-4 h-4" />
                Quick Add
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-heading font-semibold text-stone-900 mb-1 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {product.farmer && (
            <p className="text-xs text-stone-500 mb-1 font-medium">
              {product.farmer.name}
            </p>
          )}

          {product.farm_location && (
            <p className="flex items-center gap-1 text-xs text-stone-400 mb-3">
              <MapPin className="w-3 h-3 shrink-0" />
              {product.farm_location}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-1 mb-4">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-sm font-semibold text-stone-700">4.5</span>
            <span className="text-xs text-stone-400">(48)</span>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between mt-auto gap-2">
            <div>
              <span className="text-2xl font-bold text-violet-700">${Number(product.price).toFixed(2)}</span>
              <span className="text-xs text-stone-400 ml-1">/ kg</span>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isOutOfStock
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'bg-cta-600 hover:bg-cta-700 text-white shadow-sm hover:shadow-md'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {isOutOfStock ? 'Sold Out' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
