/**
 * Get the API base URL based on the current window location
 */
export function getApiBaseUrl(): string {
  const apiHost = window.location.hostname;
  return `http://${apiHost}:3000`;
}

/**
 * Get the full API URL for a given endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${endpoint}`;
}
