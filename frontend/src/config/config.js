export default {
  name: import.meta.env.VITE_APP_NAME || "Nodejs Base",
  url: {
    view: import.meta.env.BASE_URL || "/",
    api: import.meta.env.VITE_API_BASE_URL || "/api",
  },
  requestTimeoutMs: 8000,
  pageSize: 12,
  maxImageSizeBytes: 2 * 1024 * 1024,
};

