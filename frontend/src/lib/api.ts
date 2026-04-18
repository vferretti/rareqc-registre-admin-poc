import axios from "axios";
import { Configuration } from "../../api";
import { BASE_PATH } from "../../api/base";
import {
  ActivityApi,
  AdminApi,
  CartApi,
  CommunicationsApi,
  ConsentsApi,
  ContactsApi,
  DocumentsApi,
  ExternalIdsApi,
  ParticipantsApi,
  ReportsApi,
  SearchApi,
  SystemApi,
} from "../../api/api";

/** Pre-configured Axios instance for API calls. Base URL is "/api" (proxied by Vite/Nginx). */
export const axiosClient = axios.create({
  baseURL: "/api",
});

const config = new Configuration({
  basePath: "/api",
});

export const activityApi = new ActivityApi(config, BASE_PATH, axiosClient);
export const adminApi = new AdminApi(config, BASE_PATH, axiosClient);
export const cartApi = new CartApi(config, BASE_PATH, axiosClient);
export const communicationsApi = new CommunicationsApi(
  config,
  BASE_PATH,
  axiosClient,
);
export const consentsApi = new ConsentsApi(config, BASE_PATH, axiosClient);
export const contactsApi = new ContactsApi(config, BASE_PATH, axiosClient);
export const documentsApi = new DocumentsApi(config, BASE_PATH, axiosClient);
export const externalIdsApi = new ExternalIdsApi(
  config,
  BASE_PATH,
  axiosClient,
);
export const participantsApi = new ParticipantsApi(
  config,
  BASE_PATH,
  axiosClient,
);
export const reportsApi = new ReportsApi(config, BASE_PATH, axiosClient);
export const searchApi = new SearchApi(config, BASE_PATH, axiosClient);
export const systemApi = new SystemApi(config, BASE_PATH, axiosClient);

// Backward compatibility — default export is the raw axios instance used by SWR fetchers
export default axiosClient;
