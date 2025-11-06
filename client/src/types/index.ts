export interface DiffRequest {
  original: Record<string, any>;
  updated: Record<string, any>;
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
  [key: string]: any;
}

export interface SearchResponse {
  results: Product[];
  total: number;
  query: string;
  filters: Record<string, any>;
  success: boolean;
}
