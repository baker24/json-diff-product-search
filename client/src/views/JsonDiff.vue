<template>
  <div class="json-diff-container">
    <h1>JSON Diff Comparison</h1>
    <div class="history-section">
      <div v-for="diff in diffHistory" :key="diff.cacheKey" class="history-item">
        <button
          @click="clickHistory(diff)"
          :class="['btn-history', diff.cacheKey == diffResult?.cacheKey ? 'selected' : '']"
        >
          {{ new Date(diff.timestamp).toLocaleString() }}
          <span @click.stop.prevent="removeHistory(diff)" class="btn-history-remove">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        </button>
      </div>
      <button v-if="diffHistory.length > 0" @click="clearHistory" class="btn-history-clear">
        Clear All
      </button>
    </div>
    <div class="input-section">
      <div class="json-input">
        <h3>Original JSON</h3>
        <textarea
          v-model="originalJson"
          placeholder="Paste original JSON here..."
          rows="15"
        ></textarea>
        <div v-if="originalError" class="error">{{ originalError }}</div>
      </div>

      <div class="json-input">
        <h3>Compared JSON</h3>
        <textarea
          v-model="updatedJson"
          placeholder="Paste compared JSON here..."
          rows="15"
        ></textarea>
        <div v-if="updatedError" class="error">{{ updatedError }}</div>
      </div>
    </div>

    <div class="actions">
      <button @click="compareDiff" :disabled="loading" class="btn-compare">
        {{ loading ? "Comparing..." : "Compare" }}
      </button>
      <button @click="clearAll" class="btn-clear">Clear</button>
    </div>

    <div v-if="apiError" class="error-message"><strong>Error:</strong> {{ apiError }}</div>

    <div v-if="diffResult" class="diff-results">
      <h2>Comparison Results</h2>

      <div class="summary">
        <div class="summary-item added">
          <span class="label">Added:</span>
          <span class="count">{{ diffResult.summary.added }}</span>
        </div>
        <div class="summary-item modified">
          <span class="label">Modified:</span>
          <span class="count">{{ diffResult.summary.modified }}</span>
        </div>
        <div class="summary-item removed">
          <span class="label">Removed:</span>
          <span class="count">{{ diffResult.summary.removed }}</span>
        </div>
      </div>

      <div v-if="diffResult.differences.length > 0" class="full-json-view">
        <h2>Complete JSON Comparison</h2>
        <div class="json-comparison">
          <div class="json-panel">
            <h3>Original JSON</h3>
            <pre class="json-display" v-html="renderFullJson('original')"></pre>
          </div>
          <div class="json-panel">
            <h3>Compared JSON</h3>
            <pre class="json-display" v-html="renderFullJson('updated')"></pre>
          </div>
        </div>
      </div>

      <div v-if="diffResult.differences.length === 0" class="no-changes">
        No differences found. The JSON objects are identical.
      </div>

      <div v-else class="differences-list">
        <div
          v-for="(diff, index) in diffResult.differences"
          :key="index"
          :class="['diff-item', diff.type]"
        >
          <div class="diff-header">
            <span class="diff-type">{{ diff.type.toUpperCase() }}</span>
            <span class="diff-path">{{ diff.path }}</span>
          </div>

          <div class="diff-values">
            <div v-if="diff.type === 'removed' || diff.type === 'modified'" class="old-value">
              <strong>Old:</strong>
              <pre
                class="json-display"
                v-html="renderDiffValue(diff.oldValue, diff.newValue, diff.type)"
              ></pre>
            </div>
            <div v-if="diff.type === 'added' || diff.type === 'modified'" class="new-value">
              <strong>New:</strong>
              <pre
                class="json-display"
                v-html="renderDiffValue(diff.newValue, diff.oldValue, diff.type)"
              ></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "../services/api";
import type { DiffResponse, DiffHistory } from "../types";
import JSON5 from "json5";
import _ from "lodash";

const router = useRouter();
const route = useRoute();

const originalJson = ref("");
const updatedJson = ref("");
const originalError = ref("");
const updatedError = ref("");
const apiError = ref("");
const loading = ref(false);
const diffResult = ref<DiffResponse | null>(null);
const diffHistory = ref<DiffHistory[]>([]);

onMounted(() => {
  const diffCachedOnStorage = localStorage.getItem("diff-cached");
  if (diffCachedOnStorage) {
    diffHistory.value = JSON.parse(diffCachedOnStorage);
  }
  if (route.query.cache) {
    clickHistory({ cacheKey: route.query.cache as string, timestamp: new Date() });
  }
});

watch(
  diffHistory,
  (newValue) => {
    localStorage.setItem("diff-cached", JSON.stringify(newValue));
  },
  { deep: true }
);

const validateJson = (jsonString: string): { valid: boolean; data?: any; error?: string } => {
  try {
    const data = JSON5.parse(jsonString);
    return { valid: true, data };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
};

const formatValue = (value: any): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") {
    return JSON5.stringify(value, null, 2);
  }
  return String(value);
};

const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const renderDiffValue = (value: any, compareValue: any, diffType: string): string => {
  if (diffType !== "modified") {
    return escapeHtml(formatValue(value));
  }

  const valueStr = formatValue(value);
  const compareStr = formatValue(compareValue);

  if (typeof value !== "object" && typeof compareValue !== "object") {
    const diff = getCharLevelDiff(valueStr, compareStr);
    return diff;
  }

  // For objects, just escape and return
  return escapeHtml(valueStr);
};

const addToDiffHistory = (result: DiffResponse) => {
  const diffMap = new Map<string, DiffHistory>();
  diffHistory.value.forEach((_value) => {
    diffMap.set(_value.cacheKey, _value);
  });
  diffMap.set(result.cacheKey, { cacheKey: result.cacheKey, timestamp: result.timestamp });

  diffHistory.value = Array.from(diffMap.values()).sort(
    (_diff1, _diff2) => Number(_diff1.timestamp) - Number(_diff2.timestamp)
  );
};

const compareDiff = async () => {
  originalError.value = "";
  updatedError.value = "";
  apiError.value = "";
  diffResult.value = null;

  const originalValidation = validateJson(originalJson.value);
  const updatedValidation = validateJson(updatedJson.value);

  if (!originalValidation.valid) {
    originalError.value = `${originalValidation.error}`;
    return;
  }

  if (!updatedValidation.valid) {
    updatedError.value = `${updatedValidation.error}`;
    return;
  }

  loading.value = true;

  try {
    const result = await api.compareDiff({
      original: originalValidation.data,
      updated: updatedValidation.data,
    });

    diffResult.value = result;
    if (result.success && result.cacheKey) {
      router.push({
        path: "/diff",
        query: { cache: result.cacheKey },
      });
      addToDiffHistory(result);
    }
  } catch (error: any) {
    apiError.value = error.response?.data?.error || error.message || "Failed to compare JSON";
  } finally {
    loading.value = false;
  }
};

const clickHistory = async (diff: DiffHistory) => {
  originalError.value = "";
  updatedError.value = "";
  apiError.value = "";
  diffResult.value = null;

  router.push({
    path: "/diff",
    query: { cache: diff.cacheKey },
  });

  loading.value = true;
  try {
    const result = await api.getCache({ key: diff.cacheKey });

    if (result.success && result.cacheKey) {
      diffResult.value = result;
      originalJson.value = JSON5.stringify(result.original, null, 4);
      updatedJson.value = JSON5.stringify(result.updated, null, 4);
      addToDiffHistory(result);
    }
  } catch (error: any) {
    console.error(error);
    apiError.value = error.response?.data?.error || error.message || "Failed to compare JSON";
  } finally {
    loading.value = false;
  }
};

const clearHistory = () => {
  diffHistory.value = [];
  router.push({
    path: "/diff",
    query: {},
  });
  originalJson.value = "";
  updatedJson.value = "";
  originalError.value = "";
  updatedError.value = "";
  apiError.value = "";
  diffResult.value = null;
};

const removeHistory = (diff: DiffHistory) => {
  diffHistory.value = diffHistory.value.filter((_diff) => _diff.cacheKey != diff.cacheKey);
};

const clearAll = () => {
  originalJson.value = "";
  updatedJson.value = "";
  originalError.value = "";
  updatedError.value = "";
  apiError.value = "";
  diffResult.value = null;
  router.push({
    path: "/diff",
    query: {},
  });
};

const getCharLevelDiff = (str1: string, str2: string): string => {
  const chars1 = str1.split("");
  const chars2 = str2.split("");
  const maxLen = Math.max(chars1.length, chars2.length);

  let result = "";

  for (let i = 0; i < maxLen; i++) {
    const char1 = chars1[i] || "";
    const char2 = chars2[i] || "";

    if (char1 === char2) {
      result += escapeHtml(char1);
    } else {
      if (char1) {
        result += `<span class="json-char-diff">${escapeHtml(char1)}</span>`;
      }
    }
  }

  return result;
};

const highlightJsonValue = (
  jsonParsed: any,
  differences: Array<{
    path: string;
    type: "added" | "removed" | "modified";
    oldValue?: any;
    newValue?: any;
  }>,
  isOriginal: boolean,
  originalJson: any,
  updatedJson: any
): string => {
  if (differences.length === 0) {
    return escapeHtml(jsonParsed);
  }

  // Create a map of paths to their diff info
  const diffMap = new Map<string, { type: string; oldValue: any; newValue: any }>();
  differences.forEach((diff) => {
    diffMap.set(diff.path, { type: diff.type, oldValue: diff.oldValue, newValue: diff.newValue });
  });

  const mergedJson = isOriginal
    ? _.merge(updatedJson, originalJson)
    : _.merge(originalJson, updatedJson);

  const highlightObject = (obj: any, currentPath: string = "", indent: number = 0): string => {
    const indentStr = "  ".repeat(indent);

    if (obj === null) return '<span class="json-null">null</span>';
    if (obj === undefined) return '<span class="json-undefined">undefined</span>';

    const type = typeof obj;
    const diff = diffMap.get(currentPath);
    const isHighlighted =
      diff && ((diff.type === "removed" && isOriginal) || (diff.type === "added" && !isOriginal));

    if (type === "string") {
      if (diff && diff.type === "modified") {
        const compareValue = isOriginal ? String(diff.newValue) : String(diff.oldValue);
        const highlighted = getCharLevelDiff(obj, compareValue);
        return `<span class="json-string">${highlighted}</span>`;
      } else if (diff && (diff.type === "added" || diff.type === "removed")) {
        const escaped = escapeHtml(obj);
        if (isHighlighted) {
          return `<span class="json-highlighted">${escaped}</span>`;
        } else {
          return `<span class="json-removed">${escaped}</span>`;
        }
      }

      return `<span class="json-string">${escapeHtml(obj)}</span>`;
    }

    if (type === "number" || type === "boolean") {
      const strValue = String(obj);

      if (diff && diff.type === "modified") {
        const compareValue = isOriginal ? String(diff.newValue) : String(diff.oldValue);
        const highlighted = getCharLevelDiff(strValue, compareValue);
        return `<span class="json-${type}">${highlighted}</span>`;
      } else if (diff && (diff.type === "added" || diff.type === "removed")) {
        const escaped = escapeHtml(strValue);
        if (isHighlighted) {
          return `<span class="json-highlighted">${escaped}</span>`;
        } else {
          return `<span class="json-removed">${escaped}</span>`;
        }
      }
      return `<span class="json-${type}">${escapeHtml(strValue)}</span>`;
    }

    if (Array.isArray(obj)) {
      if (diff && (diff.type === "added" || diff.type === "removed")) {
        let result = isHighlighted
          ? `<span class="json-highlighted">[\n`
          : `<span class="json-removed">[\n`;

        obj.forEach((item, index) => {
          const itemPath = `${currentPath}[${index}]`;
          result += indentStr + "  " + highlightObject(item, itemPath, indent + 1);
          if (index < obj.length - 1) result += ",";
          result += "\n";
        });
        result += indentStr + "]</span>";
        return result;
      } else {
        if (obj.length === 0) return "[]";

        let result = "[\n";
        obj.forEach((item, index) => {
          const itemPath = `${currentPath}[${index}]`;
          result += indentStr + "  " + highlightObject(item, itemPath, indent + 1);
          if (index < obj.length - 1) result += ",";
          result += "\n";
        });
        result += indentStr + "]";
        return result;
      }
    }

    if (type === "object") {
      if (diff && (diff.type === "added" || diff.type === "removed")) {
        const keys = Object.keys(obj);
        if (keys.length === 0) return "{}";

        let result = isHighlighted
          ? `<span class="json-highlighted">{\n`
          : `<span class="json-removed">{\n`;
        keys.forEach((key, index) => {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          result +=
            indentStr + `  ${escapeHtml(key)}: ${highlightObject(obj[key], newPath, indent + 1)}`;
          if (index < keys.length - 1) result += ",";
          result += "\n";
        });
        result += indentStr + "}</span>";
        return result;
      } else {
        const keys = Object.keys(obj);
        if (keys.length === 0) return "{}";

        let result = "{\n";
        keys.forEach((key, index) => {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          const keyDiff = diffMap.get(newPath);

          const isKeyHighlited =
            keyDiff &&
            ((keyDiff.type === "removed" && isOriginal) ||
              (keyDiff.type === "added" && !isOriginal));

          const isKeyRemoved =
            keyDiff &&
            ((keyDiff.type === "added" && isOriginal) ||
              (keyDiff.type === "removed" && !isOriginal));

          const keyStr = isKeyHighlited
            ? `<span class="json-highlighted">"${escapeHtml(key)}":</span>`
            : isKeyRemoved
            ? `<span class="json-removed">"${escapeHtml(key)}":</span>`
            : `<span class="json-key">"${escapeHtml(key)}":</span>`;

          result += indentStr + `  ${keyStr} ${highlightObject(obj[key], newPath, indent + 1)}`;
          if (index < keys.length - 1) result += ",";
          result += "\n";
        });
        result += indentStr + "}";
        return result;
      }
    }

    return escapeHtml(String(obj));
  };

  return highlightObject(mergedJson);
};

const renderFullJson = (type: "original" | "updated"): string => {
  if (!diffResult.value) return "";

  const jsonStr = type === "original" ? originalJson.value : updatedJson.value;

  return highlightJsonValue(
    JSON5.parse(jsonStr),
    diffResult.value.differences,
    type === "original",
    JSON5.parse(originalJson.value),
    JSON5.parse(updatedJson.value)
  );
};
</script>

<style scoped>
.json-diff-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
}

.input-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.history-section {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 20px;
}
.json-input {
  display: flex;
  flex-direction: column;
}

.json-input h3 {
  color: #34495e;
  margin-bottom: 10px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 14px;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: #3498db;
}

.error {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 5px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
}

button {
  padding: 12px 30px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-compare {
  background-color: #3498db;
  color: white;
}

.btn-compare:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-compare:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* history buttons */
.btn-history {
  background-color: #3498db;
  color: white;
  padding: 8px;
  margin: 8px;
  position: relative;
}

.btn-history:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-history:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.btn-history.selected {
  border: 1px solid #bd1010;
}

.btn-history-clear {
  background-color: #95a5a6;
  color: white;
  padding: 8px;
  margin: 8px;
}

.btn-history-remove {
  position: absolute;
  right: -10px;
  top: -10px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #e8fdff;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: color 0.2s;
  border: solid 1px #d2e4e6;
}

.btn-history-remove:hover {
  color: #e74c3c;
}

/* Clear Button */
.btn-clear {
  background-color: #95a5a6;
  color: white;
}

.btn-clear:hover {
  background-color: #7f8c8d;
}

.error-message {
  background-color: #fee;
  border: 1px solid #e74c3c;
  padding: 15px;
  border-radius: 4px;
  color: #c0392b;
  margin-bottom: 20px;
}

.diff-results {
  margin-top: 30px;
}

.diff-results h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.summary {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  justify-content: center;
}

.summary-item {
  padding: 15px 25px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.summary-item.added {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.summary-item.modified {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
}

.summary-item.removed {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.summary-item .label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.summary-item .count {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
}

.no-changes {
  text-align: center;
  padding: 40px;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #6c757d;
  font-size: 16px;
}

.differences-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.diff-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
}

.diff-item.added {
  border-left: 4px solid #28a745;
  background-color: #f0f9f4;
}

.diff-item.modified {
  border-left: 4px solid #ffc107;
  background-color: #fffbf0;
}

.diff-item.removed {
  border-left: 4px solid #dc3545;
  background-color: #fef5f6;
}

.diff-header {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 12px;
}

.diff-type {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.diff-item.added .diff-type {
  background-color: #28a745;
}

.diff-item.modified .diff-type {
  background-color: #ffc107;
  color: #333;
}

.diff-item.removed .diff-type {
  background-color: #dc3545;
}

.diff-path {
  font-family: "Courier New", monospace;
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.diff-values {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.diff-item.added .diff-values,
.diff-item.removed .diff-values {
  grid-template-columns: 1fr;
}

.old-value,
.new-value {
  padding: 10px;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.old-value {
  border: 1px solid #dc3545;
}

.new-value {
  border: 1px solid #28a745;
}

.diff-values strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #495057;
}

.diff-values pre {
  margin: 0;
  font-family: "Courier New", monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
  color: #212529;
}

/* Character-level diff highlighting */
.diff-values :deep(.char-diff) {
  background-color: #ffeb3b;
  color: #d32f2f;
  font-weight: bold;
  padding: 1px 2px;
  border-radius: 2px;
}

/* Full JSON View */
.full-json-view {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 2px solid #ddd;
}

.full-json-view h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
}

.json-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.json-panel {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.json-panel h3 {
  background-color: #34495e;
  color: white;
  padding: 12px 15px;
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.json-display {
  margin: 0;
  padding: 20px;
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  background-color: #ffffff;
  color: #212529;
  white-space: pre;
}

/* JSON syntax highlighting */
.json-display :deep(.json-key) {
  color: #0066cc;
  font-weight: 500;
}

.json-display :deep(.json-string) {
  color: #22863a;
}

.json-display :deep(.json-number) {
  color: #005cc5;
}

.json-display :deep(.json-boolean) {
  color: #d73a49;
}

.json-display :deep(.json-null) {
  color: #6f42c1;
}

.json-display :deep(.json-highlighted) {
  background-color: #ffcdd2;
  color: #c62828;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px solid #ef5350;
}

.json-display :deep(.json-removed) {
  background-color: #c5c5c5;
  color: #000000;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px solid #727272;
  color: transparent;
}

.json-display :deep(.json-removed .json-key),
.json-display :deep(.json-removed .json-string),
.json-display :deep(.json-removed .json-boolean),
.json-display :deep(.json-removed .json-null),
.json-display :deep(.json-removed .json-number) {
  color: transparent;
  user-select: none;
}
.json-display :deep(.json-char-diff) {
  background-color: #ffeb3b;
  color: #d32f2f;
  font-weight: bold;
  padding: 0px;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .input-section {
    grid-template-columns: 1fr;
  }

  .diff-values {
    grid-template-columns: 1fr;
  }

  .summary {
    flex-direction: column;
    align-items: stretch;
  }

  .json-comparison {
    grid-template-columns: 1fr;
  }
}
</style>
