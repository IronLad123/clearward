/**
 * apiClient.js — Centralized API fetch wrapper for Clearward.
 * Uses VITE_API_URL env var. Falls back to '' (same-origin).
 * For education only. Not investment advice.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.detail || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export { BASE_URL };
