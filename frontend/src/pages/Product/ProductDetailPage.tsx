import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/products';
import { cartApi } from '../../api/cart';
import { getSessionId } from '../../utils/sessionId';
import { ShoppingCart, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getProductBySlug(slug!),
    enabled: !!slug,
  });

  const product = data?.data?.product;

  const addToCartMutation = useMutation({
    mutationFn: (data: any) => cartApi.addToCart(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    },
  });

  const handleAddToCart = () => {
    if (!product) return;

    const variant = product.variants?.find((v: any) => v.sku === selectedVariant);
    const availableStock = variant?.stock ?? product.stock;

    if (availableStock < quantity) {
      toast.error('Not enough stock available');
      return;
    }

    addToCartMutation.mutate({
      productId: product._id,
      variantSku: selectedVariant,
      quantity,
      sessionId: getSessionId(),
    });
  };

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-300 h-96 rounded"></div>
            <div className="space-y-4">
              <div className="bg-gray-300 h-8 rounded"></div>
              <div className="bg-gray-300 h-4 rounded"></div>
              <div className="bg-gray-300 h-20 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-custom py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <button onClick={() => navigate('/products')} className="btn-primary">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const variant = product.variants?.find((v: any) => v.sku === selectedVariant);
  const currentPrice = variant?.price ?? product.price;
  const availableStock = variant?.stock ?? product.stock;

  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="bg-gray-100 rounded-lg overflow-hidden mb-4">
            {product.images?.[selectedImage] ? (
              <img
                src={product.images[selectedImage].url}
                alt={product.name}
                className="w-full h-96 object-cover"
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center">
                <ShoppingCart className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`border-2 rounded overflow-hidden ${
                    selectedImage === index ? 'border-primary-600' : 'border-gray-300'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl font-bold text-primary-600">
              ₹{(currentPrice / 100).toFixed(2)}
            </span>
            {product.rating > 0 && (
              <div className="flex items-center">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-semibold">{product.rating.toFixed(1)}</span>
                <span className="text-gray-600 ml-1">
                  ({product.reviewsCount} reviews)
                </span>
              </div>
            )}
          </div>

          <p className="text-gray-700 mb-6">{product.description}</p>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Options</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant: any) => (
                  <button
                    key={variant.sku}
                    onClick={() => setSelectedVariant(variant.sku)}
                    disabled={variant.stock === 0}
                    className={`px-4 py-2 rounded border-2 transition ${
                      selectedVariant === variant.sku
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {variant.attributes.size || variant.attributes.color || variant.sku}
                    {variant.stock === 0 && <span className="ml-1">(Out)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Quantity</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="btn-secondary px-4"
              >
                -
              </button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                className="btn-secondary px-4"
                disabled={quantity >= availableStock}
              >
                +
              </button>
              <span className="text-gray-600 ml-2">
                {availableStock} available
              </span>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={availableStock === 0 || addToCartMutation.isPending}
            className="btn-primary w-full mb-4"
          >
            {availableStock === 0
              ? 'Out of Stock'
              : addToCartMutation.isPending
              ? 'Adding...'
              : 'Add to Cart'}
          </button>

          {/* Category & Tags */}
          <div className="border-t pt-4 space-y-2">
            {product.category && (
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Category:</span> {product.category.name}
              </p>
            )}
            {product.tags && product.tags.length > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.tags.map((tag: string) => (
                    <span key={tag} className="bg-gray-200 px-2 py-1 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
