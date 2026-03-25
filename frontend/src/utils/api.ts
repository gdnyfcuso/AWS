/**
 * Get the API base URL based on the current environment
 * In development, use relative path to leverage Vite proxy
 * In production, use the full backend URL
 */
export function getApiBaseUrl(): string {
  // 如果是开发环境（端口 5173, 5174, 5175），使用相对路径（通过 Vite 代理）
  const port = window.location.port;
  if (port === '5173' || port === '5174' || port === '5175') {
    return ''; // 使用相对路径，让 Vite 代理处理
  }
  // 生产环境或其他情况，使用完整 URL
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
