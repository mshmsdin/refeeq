// Use the build's base path for both fetch requests and browser-loaded images.
export function apiUrl(endpoint, base = import.meta.env?.BASE_URL || '/') {
  return `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

export function imageUrl(imagePath, base = import.meta.env?.BASE_URL || '/') {
  return apiUrl(`/api/image/raw?path=${encodeURIComponent(imagePath)}`, base);
}
