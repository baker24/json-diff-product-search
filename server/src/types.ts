export interface Difference {
  path: string;
  type: "added" | "removed" | "modified";
  oldValue: any;
  newValue: any;
}

export interface DiffRequestBody {
  original: any;
  updated: any;
}

export interface DiffResponse {
  success: boolean;
  cacheKey: string;
  differences: Difference[];
  timestamp: Date;
  summary: {
    total: number;
    added: number;
    removed: number;
    modified: number;
  };
}

export interface CachedDiff {
  original: any;
  updated: any;
  differences: Difference[];
  timestamp: Date;
  cacheKey: string;
  summary: {
    total: number;
    added: number;
    removed: number;
    modified: number;
  };
}

export interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  inStock: boolean;
  description: string;
}

export interface SearchFilters {
  category?: string;
  brand?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

export interface SearchRequestBody {
  query?: string;
  filters?: SearchFilters;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  success: boolean;
  results: Product[];
  total: number;
  query: string;
  filters: string[];
}

export interface FilterOptions {
  categories: string[];
  brands: string[];
  priceRange: {
    min: number;
    max: number;
  };
}
