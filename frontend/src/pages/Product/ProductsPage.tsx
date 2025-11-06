import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { productsApi } from '../../api/products';
import { ShoppingCart, Star, Search } from 'lucide-react';
import CategoryNavbar from '../../components/CategoryNavbar';
import { mockProducts } from '../../data/mockProducts';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedCategory = searchParams.get('category');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', { q: searchParams.get('q'), category: selectedCategory, page }],
    queryFn: () =>
      productsApi.getProducts({
        q: searchParams.get('q') || undefined,
        category: selectedCategory || undefined,
        page,
        limit: 12,
      }),
  });

  // Use mock products as fallback when API is unavailable, with filtering
  const filteredMockProducts = useMemo(() => {
    let filtered = [...mockProducts];

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category.slug === selectedCategory);
    }

    // Filter by search query
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [selectedCategory, searchParams]);

  const products = data?.data?.products || (isError ? filteredMockProducts : []);
  const pagination = data?.data?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set('q', search);
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo(0, 0);
  };

  const handleCategorySelect = (slug: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="flex">
      {/* Category Sidebar */}
      <CategoryNavbar
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {/* Main Content */}
      <div className="flex-1 container-custom py-8">
        <h1 className="text-4xl font-bold mb-8">Products</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </div>
      </form>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="bg-gray-300 h-48 mb-4 rounded"></div>
              <div className="bg-gray-300 h-4 mb-2 rounded"></div>
              <div className="bg-gray-300 h-4 w-2/3 rounded"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <Link
                key={product._id}
                to={`/products/${product.slug}`}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="relative pb-[100%] mb-4 bg-gray-100 rounded overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-semibold">Out of Stock</span>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold mb-2 truncate">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary-600">
                    ₹{(product.price / 100).toFixed(2)}
                  </span>
                  {product.rating > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                      {product.rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                {[...Array(pagination.pages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-4 py-2 rounded ${
                      page === i + 1
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.pages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default ProductsPage;
