import type { Category } from '../types';

export const mockCategories: Category[] = [
  {
    _id: 'cat1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Phones, laptops, headphones, and other electronic devices',
    isActive: true,
  },
  {
    _id: 'cat2',
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing, accessories, and fashion items',
    isActive: true,
  },
  {
    _id: 'cat3',
    name: 'Sports',
    slug: 'sports',
    description: 'Sports equipment, fitness gear, and athletic wear',
    isActive: true,
  },
  {
    _id: 'cat4',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Home appliances, kitchen gadgets, and decor',
    isActive: true,
  },
];
