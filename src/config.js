// Base URL of the API. Set VITE_API_URL when starting or building the client to use another address.
export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5001"
).replace(/\/+$/, "");
