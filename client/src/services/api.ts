import axios from "axios";
import type {
  CacheRequestParams,
  CacheResponse,
  DiffRequest,
  DiffResponse,
  SearchParams,
  SearchResponse,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const api = {
  compareDiff: async (data: DiffRequest): Promise<DiffResponse> => {
    const response = await apiClient.post("/diff", data);
    return response.data;
  },

  searchProducts: async (params: SearchParams): Promise<SearchResponse> => {
    const response = await apiClient.get("/search", { params });
    return response.data;
  },

  getCache: async (params: CacheRequestParams): Promise<CacheResponse> => {
    const response = await apiClient.get("/diff/" + params.key);
    return response.data;
  },
};

export default api;
