export interface DiffRequest {
  original: Record<string, any>;
  updated: Record<string, any>;
}

export interface CacheRequestParams {
  key: string;
}

export interface DiffResponse {
  differences: Array<{
    path: string;
    type: "added" | "removed" | "modified";
    oldValue?: any;
    newValue?: any;
  }>;
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
  success: boolean;
  cacheKey: string;
  timestamp: Date;
}

export interface CacheResponse {
  original: any;
  updated: any;
  differences: Array<{
    path: string;
    type: "added" | "removed" | "modified";
    oldValue?: any;
    newValue?: any;
  }>;
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
  success: boolean;
  cacheKey: string;
  timestamp: Date;
}
export interface DiffHistory {
  cacheKey: string;
  timestamp: Date;
}
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  offset?: number;
  limit?: number;
}

export interface Product {
  id: string | number;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  brand?: string;
  rating?: number;
  inStock?: boolean;
  imageUrl?: string;
  [key: string]: any;
}

export interface SearchResponse {
  results: Product[];
  total: number;
  query: string;
  filters: Record<string, any>;
  success: boolean;
}
