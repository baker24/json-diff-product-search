import express, { Request, Response, Application } from "express";
import cors from "cors";
import NodeCache from "node-cache";
import { MeiliSearch, Index } from "meilisearch";
import {
  Difference,
  DiffRequestBody,
  DiffResponse,
  CachedDiff,
  Product,
  SearchFilters,
  SearchRequestBody,
  SearchResponse,
  FilterOptions,
} from "./types";
import dotenv from "dotenv";
import { samples } from "./sample";
dotenv.config();

const app: Application = express();
const cache = new NodeCache({ stdTTL: 3600 });

app.use(cors());
app.use(express.json());

// MeiliSearch client
const meiliClient = new MeiliSearch({
  host: process.env.MEILI_HOST || "http://127.0.0.1:7700",
  apiKey: process.env.MEILI_API_KEY || "masterKey",
});

// Part 1: JSON Diff API

function compareObjects(obj1: any, obj2: any, path: string = ""): Difference[] {
  const differences: Difference[] = [];
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const minLength = Math.min(obj1.length, obj2.length);
    for (let i = 0; i < minLength; i++) {
      const newArrayPath = path + `[${i}]`;
      if (
        typeof obj1[i] == "object" &&
        typeof obj1[i] == "object" &&
        obj1[i] !== null &&
        obj2[i] !== null
      ) {
        differences.push(...compareObjects(obj1[i], obj2[i], newArrayPath));
      } else if (obj1[i] !== obj2[i]) {
        differences.push({
          path: newArrayPath,
          type: "modified",
          oldValue: obj1[i],
          newValue: obj2[i],
        });
      }
    }

    for (let i = minLength; i < obj1.length; i++) {
      const newArrayPath = path + `[${i}]`;
      differences.push({
        path: newArrayPath,
        type: "removed",
        oldValue: obj1[i],
        newValue: undefined,
      });
    }

    for (let i = minLength; i < obj2.length; i++) {
      const newArrayPath = path + `[${i}]`;
      differences.push({
        path: newArrayPath,
        type: "added",
        oldValue: undefined,
        newValue: obj2[i],
      });
    }
  } else {
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    allKeys.forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (val1 === undefined && val2 !== undefined) {
        differences.push({
          path: currentPath,
          type: "added",
          oldValue: undefined,
          newValue: val2,
        });
      } else if (val1 !== undefined && val2 === undefined) {
        differences.push({
          path: currentPath,
          type: "removed",
          oldValue: val1,
          newValue: undefined,
        });
      } else if (
        typeof val1 === "object" &&
        val1 !== null &&
        typeof val2 === "object" &&
        val2 !== null
      ) {
        differences.push(...compareObjects(val1, val2, currentPath));
      } else if (val1 !== val2) {
        differences.push({
          path: currentPath,
          type: "modified",
          oldValue: val1,
          newValue: val2,
        });
      }
    });
  }

  return differences;
}

// Compare two JSON payloads
app.post("/api/diff", (req: Request<{}, {}, DiffRequestBody>, res: Response) => {
  try {
    const { original, updated } = req.body;

    if (!original || !updated) {
      return res.status(400).json({ error: "Both original and updated payloads are required" });
    }

    const differences = compareObjects(original, updated);

    // Generate a cache key and store for reference
    const cacheKey = `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cachedData: CachedDiff = {
      original,
      updated,
      differences,
      timestamp: new Date(),
      cacheKey,
      summary: {
        total: differences.length,
        added: differences.filter((d) => d.type === "added").length,
        removed: differences.filter((d) => d.type === "removed").length,
        modified: differences.filter((d) => d.type === "modified").length,
      },
    };
    cache.set(cacheKey, cachedData);

    const response: DiffResponse = {
      success: true,
      cacheKey,
      differences,
      timestamp: new Date(),
      summary: {
        total: differences.length,
        added: differences.filter((d) => d.type === "added").length,
        removed: differences.filter((d) => d.type === "removed").length,
        modified: differences.filter((d) => d.type === "modified").length,
      },
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Error comparing JSON payloads", details: errorMessage });
  }
});

app.get("/api/diff/:key", (req: Request<{ key: string }>, res: Response) => {
  const data = cache.get<CachedDiff>(req.params.key);
  if (!data) {
    return res.status(404).json({ error: "Diff not found or expired" });
  }
  const response = {
    original: data.original,
    updated: data.updated,
    success: true,
    cacheKey: req.params.key,
    differences: data.differences,
    timestamp: data.timestamp,
    summary: {
      total: data.differences.length,
      added: data.differences.filter((d) => d.type === "added").length,
      removed: data.differences.filter((d) => d.type === "removed").length,
      modified: data.differences.filter((d) => d.type === "modified").length,
    },
  };
  res.json(response);
});

// ==================== PART 2: SEARCH API ====================

// Initialize MeiliSearch index
async function initializeSearch(): Promise<void> {
  try {
    const health = await meiliClient.health();
    console.log("✅ Connected to MeiliSearch Cloud:", health);

    // const index: Index<Product> = meiliClient.index("products");

    // // Add documents
    // await index.addDocuments(sampleProducts, { primaryKey: "id" });

    // // Configure searchable attributes
    // await index.updateSearchableAttributes(["name", "description", "brand", "category"]);

    // // Configure filterable attributes
    // await index.updateFilterableAttributes(["category", "brand", "inStock", "price", "rating"]);

    // // Configure sortable attributes
    // await index.updateSortableAttributes(["price", "rating", "name"]);

    const categoryMap = new Map<string, any>();
    samples.forEach((_sample) => {
      categoryMap.set(_sample.category, true);
    });
    console.log(Array.from(categoryMap.keys()));
    console.log("MeiliSearch index initialized successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error initializing MeiliSearch:", errorMessage);
    console.log("Note: Make sure MeiliSearch is running on http://127.0.0.1:7700");
  }
}

// Search products with filters
app.get("/api/search", async (req: Request<{}, {}, {}, SearchRequestBody>, res: Response) => {
  console.log("API/Search", req.query);
  try {
    const { query = "", filters = {}, sort = "", limit = 20, offset = 0 } = req.query;

    // Build filter string for MeiliSearch
    const filterParts: string[] = [];

    if (filters.category) {
      filterParts.push(`category = '${filters.category}'`);
    }

    if (filters.brand) {
      filterParts.push(`brand = ${filters.brand}`);
    }

    if (filters.inStock !== undefined) {
      filterParts.push(`inStock = ${filters.inStock}`);
    }

    if (filters.minPrice !== undefined) {
      filterParts.push(`price >= ${filters.minPrice}`);
    }

    if (filters.maxPrice !== undefined) {
      filterParts.push(`price <= ${filters.maxPrice}`);
    }

    if (filters.minRating !== undefined) {
      filterParts.push(`rating >= ${filters.minRating}`);
    }

    const searchParams = {
      limit: parseInt(`${limit}`),
      offset: parseInt(`${offset}`),
      filter: filterParts.length > 0 ? filterParts.join(" AND ") : undefined,
      sort: sort ? [sort] : undefined,
    };

    const index: Index<Product> = meiliClient.index("products");
    const results = await index.search(query, searchParams);
    console.log(results);

    const response: SearchResponse = {
      success: true,
      results: results.hits as Product[],
      total: results.estimatedTotalHits || 0,
      query,
      filters: filterParts,
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log("Search error", error);
    res.status(500).json({
      error: "Search error",
      details: errorMessage,
      note: "Make sure MeiliSearch is running",
    });
  }
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Start server and initialize search
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("\nInitializing MeiliSearch...");
  await initializeSearch();
});
