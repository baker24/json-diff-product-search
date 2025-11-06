# JSON Diff & Product Search Application

A full-stack application with Vue.js frontend and Express.js backend:

- **Part 1**
- Accepts and compares two JSON payloads (representing product updates).
- Shows visual differences in a clear, user-friendly frontend.
- Minimizes backend storage (use cache or file if needed).
- Uses clear and simple comparison logic.
- incase you are not using Laravel substube that with any backend like express etc 

- **Part 2**
- This is a separate flow focused on demonstrating search as /search integration and filters, not the diff store. 
- You may use any small sample dataset. The value is in the integration, filters, and UI.
- You can pick any service provider like Algolia, Meilisearch etc 

### Part 1: JSON Diff Comparison
- Compare two JSON payloads side-by-side
- Visual highlighting of additions, removals, and modifications
- Summary statistics (total changes, added, removed, modified)
- In-memory caching for performance
- Sample data loader for quick testing
- Clean, intuitive UI with color-coded differences

### Part 2: Product Search
- Full-text search powered by MeiliSearch
- Real-time search with debouncing
- Multiple sorting options
- Responsive product grid layout
- 10 sample products included

## 📋 Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MeiliSearch server (for Part 2 - Search functionality)

## 🛠️ Installation

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Install and Run MeiliSearch (for Search feature)

```bash
# Windows
meilisearch.exe --master-key="masterKey"
```
MeiliSearch will run on `http://127.0.0.1:7700`

## 🚀 Running the Application

### 1. Start the Backend Server

```bash
node server.js
```
The server will start on `http://localhost:3000`

### 2. Open the Frontend

## 🎨 Technology Stack

**Frontend:**
- Vue.js / Vite

**Backend:**
- Express.js
- Node-cache for in-memory storage
- MeiliSearch client for search functionality
- CORS enabled

**Search Engine:**
- MeiliSearch - Fast, typo-tolerant search

## 🔧 Configuration

### Environment Variables

You can configure the backend using environment variables:

```bash
# Server port (default: 3000)
PORT=3000

# MeiliSearch host (default: http://127.0.0.1:7700)
MEILI_HOST=http://127.0.0.1:7700

# MeiliSearch API key (default: masterKey)
MEILI_API_KEY=masterKey
```
You can configure the frontend using environment variables:

```bash
API_URL=https://localhost:3000
