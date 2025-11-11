<template>
  <div class="product-search-container">
    <h1>Product Search</h1>

    <div class="search-section">
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search products..."
          class="search-input"
          @keydown.enter="() => handleSearch(true)"
        />
        <button @click="() => handleSearch(true)" :disabled="loading" class="btn-search">
          {{ loading ? "Searching..." : "Search" }}
        </button>
      </div>

      <div class="filters-section">
        <h3>Filters</h3>

        <div class="filters-grid">
          <div class="filter-group">
            <label>Category</label>
            <select v-model="filters.category">
              <option value="">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="clothing & accessories">Clothing & Accessories</option>
              <option value="tools & home improvement">Tools & Home Improvement</option>
              <option value="toys & games">Toys & Games</option>
              <option value="beauty & personal care">Beauty & Personal Care</option>
              <option value="home & kitchen">Home & Kitchen</option>
              <option value="lighting">Lighting</option>
              <option value="office supplies">Office Supplies</option>
              <option value="furniture">Furniture</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Min Price</label>
            <input v-model.number="filters.minPrice" type="number" placeholder="Min" min="0" />
          </div>

          <div class="filter-group">
            <label>Max Price</label>
            <input v-model.number="filters.maxPrice" type="number" placeholder="Max" min="0" />
          </div>

          <div class="filter-group">
            <label>Brand</label>
            <input v-model="filters.brand" type="text" placeholder="Brand name" />
          </div>

          <div class="filter-group">
            <label>Min Rating</label>
            <input v-model="filters.minRating" type="number" placeholder="Rating" min="0" />
          </div>

          <div class="filter-group">
            <label>In Stock Only</label>
            <input v-model="filters.inStock" type="checkbox" class="checkbox-input" />
          </div>

          <div class="filter-group">
            <button @click="clearFilters" class="btn-clear-filters">Clear Filters</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message"><strong>Error:</strong> {{ error }}</div>

    <div v-if="searchResult" class="results-section">
      <div class="results-header">
        <h2>Results</h2>
        <div class="results-info">
          <span class="results-count">{{ searchResult.total }} products found</span>
        </div>
      </div>

      <div v-if="searchResult.results.length === 0" class="no-results">
        <p>No products found matching your criteria.</p>
        <p>Try adjusting your search or filters.</p>
      </div>

      <div v-else class="products-grid">
        <div v-for="product in searchResult.results" :key="product.id" class="product-card">
          <img v-if="product.imageUrl" class="product-image" v-lazy="product.imageUrl" />
          <div class="product-header">
            <h3>{{ product.name }}</h3>
            <span v-if="product.price" class="product-price">
              ${{ product.price.toFixed(2) }}
            </span>
          </div>

          <div v-if="product.description" class="product-description">
            {{ product.description }}
          </div>

          <div class="product-details">
            <span v-if="product.category" class="product-tag category">
              {{ product.category }}
            </span>
            <span v-if="product.brand" class="product-tag brand">
              {{ product.brand }}
            </span>
            <span
              v-if="product.inStock !== undefined"
              :class="['product-tag', 'stock', product.inStock ? 'in-stock' : 'out-of-stock']"
            >
              {{ product.inStock ? `In stock` : "Out of stock" }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="searchResult.total > currentLimit" class="pagination">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1 || loading"
          class="btn-page"
        >
          Previous
        </button>
        <span class="page-info"> Page {{ currentPage }} of {{ totalPages }} </span>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage >= totalPages || loading"
          class="btn-page"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from "vue";
import { api } from "../services/api";
import type { SearchResponse } from "../types";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const searchQuery = ref((route.query.search as string) || "");
const loading = ref(false);
const error = ref("");
const searchResult = ref<SearchResponse | null>(null);
const currentPage = ref(route.query.page ? parseInt(route.query.page as string) : 1);
const currentLimit = ref(20);

const filters = reactive({
  category: (route.query.category as string) || "",
  minPrice: route.query.minPrice ? parseFloat(route.query.minPrice as string) : null,
  maxPrice: route.query.maxPrice ? parseFloat(route.query.maxPrice as string) : null,
  minRating: route.query.minRating ? parseFloat(route.query.minRating as string) : null,
  brand: (route.query.brand as string) || "",
  inStock: route.query.inStock == "true",
});

onMounted(() => {
  handleSearch(true);
});

const totalPages = computed(() => {
  if (!searchResult.value) return 0;
  return Math.ceil(searchResult.value.total / currentLimit.value);
});

const buildFilters = () => {
  const filterObj: Record<string, any> = {};

  if (filters.category) {
    filterObj.category = filters.category;
  }

  if (filters.minPrice !== null && filters.minPrice > 0) {
    filterObj.minPrice = filters.minPrice;
  }

  if (filters.maxPrice !== null && filters.maxPrice > 0) {
    filterObj.maxPrice = filters.maxPrice;
  }

  if (filters.brand) {
    filterObj.brand = filters.brand;
  }

  if (filters.inStock) {
    filterObj.inStock = true;
  }

  if (filters.minRating) {
    filterObj.minRating = filters.minRating;
  }

  return filterObj;
};

const handleSearch = async (resetPage = true) => {
  if (resetPage) {
    currentPage.value = 1;
  }

  error.value = "";
  loading.value = true;

  let queryParams = {};
  if (searchQuery.value) {
    queryParams = { search: searchQuery.value };
  }
  if (filters.category) {
    queryParams = { ...queryParams, category: filters.category };
  }
  if (filters.minPrice) {
    queryParams = { ...queryParams, minPrice: filters.minPrice };
  }
  if (filters.maxPrice) {
    queryParams = { ...queryParams, maxPrice: filters.maxPrice };
  }
  if (filters.minRating) {
    queryParams = { ...queryParams, minRating: filters.minRating };
  }
  if (filters.brand) {
    queryParams = { ...queryParams, brand: filters.brand };
  }
  if (filters.inStock) {
    queryParams = { ...queryParams, inStock: filters.inStock ? "true" : "false" };
  }
  queryParams = { ...queryParams, page: currentPage.value };

  router.push({
    path: "/search",
    query: queryParams,
  });

  try {
    const result = await api.searchProducts({
      query: searchQuery.value || "",
      filters: buildFilters(),
      offset: (currentPage.value - 1) * currentLimit.value,
      limit: currentLimit.value,
    });
    console.log("result", result);
    searchResult.value = result;
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || "Failed to search products";
    searchResult.value = null;
  } finally {
    loading.value = false;
  }
};

const clearFilters = () => {
  filters.category = "";
  filters.minPrice = null;
  filters.maxPrice = null;
  filters.brand = "";
  filters.inStock = false;
  filters.minRating = null;
  handleSearch();
};

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  handleSearch(false);
};
</script>

<style scoped>
.product-search-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
}

.search-section {
  background-color: #f8f9fa;
  padding: 25px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.btn-search {
  padding: 12px 30px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-search:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-search:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.filters-section h3 {
  color: #34495e;
  margin-bottom: 15px;
  font-size: 18px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.filter-group label {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.filter-group input[type="text"],
.filter-group input[type="number"],
.filter-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-group input[type="text"]:focus,
.filter-group input[type="number"]:focus,
.filter-group select:focus {
  outline: none;
  border-color: #3498db;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.btn-clear-filters {
  padding: 10px 20px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-clear-filters:hover {
  background-color: #5a6268;
}

.error-message {
  background-color: #fee;
  border: 1px solid #e74c3c;
  padding: 15px;
  border-radius: 4px;
  color: #c0392b;
  margin-bottom: 20px;
}

.results-section {
  margin-top: 30px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e9ecef;
}

.results-header h2 {
  color: #2c3e50;
  margin: 0;
}

.results-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #6c757d;
}

.results-count {
  font-weight: 600;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
}

.no-results p {
  margin: 10px 0;
  font-size: 16px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.product-card {
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.3s, transform 0.3s;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.product-image {
  width: 100%;
  border-radius: 0.5rem;
}
.product-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
  gap: 10px;
}

.product-header h3 {
  color: #2c3e50;
  font-size: 18px;
  margin: 0;
  flex: 1;
}

.product-price {
  font-size: 20px;
  font-weight: bold;
  color: #27ae60;
  white-space: nowrap;
}

.product-description {
  color: #6c757d;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.product-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.product-tag.category {
  background-color: #e3f2fd;
  color: #1976d2;
}

.product-tag.brand {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.product-tag.stock {
  font-weight: 600;
}

.product-tag.in-stock {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.product-tag.out-of-stock {
  background-color: #ffebee;
  color: #c62828;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.btn-page {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-page:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-page:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }

  .results-header {
    flex-direction: column;
    align-items: start;
    gap: 10px;
  }

  .results-info {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
