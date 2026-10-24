import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import { mockCategories } from '../data/mockCategories';
import type { Category } from '../types';

interface CategoryNavbarProps {
  selectedCategory: string | null;
  onCategorySelect: (slug: string | null) => void;
}

const CategoryNavbar = ({ selectedCategory, onCategorySelect }: CategoryNavbarProps) => {
  const { data, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
  });

  const categories = data?.data?.categories || (isError ? mockCategories : []);

  return (
    <aside className="w-56 bg-gray-50 border-r border-gray-200 p-4 hidden md:block">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Categories</h2>

      <nav>
        <ul className="space-y-1">
          {/* All Products Option */}
          <li>
            <button
              onClick={() => onCategorySelect(null)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === null
                  ? 'bg-primary-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Products
            </button>
          </li>

          {/* Category List */}
          {categories.map((category: Category) => (
            <li key={category._id}>
              <button
                onClick={() => onCategorySelect(category.slug)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.slug
                    ? 'bg-primary-600 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default CategoryNavbar;
