/**
 * ProductCard Component
 * Displays product information in a card format
 */

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Star } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product.id);
    }
  };

  return (
    <Link href={`/products/${product.id}`}>
      <Card hover padding="none" className="h-full">
        {/* Product Image */}
        <div className="aspect-square bg-gray-200 rounded-t-3xl relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-6xl">📦</span>
            </div>
          )}
          
          {/* Stock Badge */}
          {product.stock === 0 && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Out of Stock
            </div>
          )}
          
          {product.stock > 0 && product.stock < 10 && (
            <div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Low Stock
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="font-heading font-semibold text-lg text-gray-900 mb-1 line-clamp-2">
            {product.name}
          </h3>
          
          {/* Farmer Info */}
          {product.farmer && (
            <p className="text-sm text-gray-600 mb-2">
              by {product.farmer.name}
            </p>
          )}
          
          {/* Location */}
          {product.farm_location && (
            <p className="text-xs text-gray-500 mb-3">
              📍 {product.farm_location}
            </p>
          )}
          
          {/* Price and Rating */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-primary">
              ${product.price.toFixed(2)}
            </span>
            
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
              <span className="text-sm text-gray-600">4.5</span>
            </div>
          </div>
          
          {/* Add to Cart Button */}
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </Card>
    </Link>
  );
};

export default ProductCard;
