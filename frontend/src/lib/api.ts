import axios from "axios";

/** Pre-configured Axios instance for API calls. Base URL is "/api" (proxied by Vite/Nginx). */
const api = axios.create({
  baseURL: "/api",
});

export default api;
