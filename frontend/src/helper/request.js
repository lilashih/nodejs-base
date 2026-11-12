import config from "../config/config.js";
import auth from "../config/auth.js";
import { broadcastAuthSignal, AuthSignal } from "../channel/authChannel.js";

const appendQuery = (url, data) => {
  const params = new URLSearchParams();
  Object.entries(data ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `${url}${url.includes("?") ? "&" : "?"}${query}` : url;
};

const toApiUrl = (path) => {
  const base = config.url.api.replace(/\/$/, "");
  const relative = String(path).replace(/^\/+/, "");
  return `${base}/${relative}`;
};

const fieldErrors = (errors) => {
  if (!Array.isArray(errors)) return {};
  return Object.fromEntries(errors.map(({ name, message }) => [name, message]));
};

const request = async (method, path, data = null, options = {}) => {
  const normalizedMethod = String(method).toUpperCase();
  const queryMethod = normalizedMethod === "GET" || normalizedMethod === "HEAD";
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  let url = toApiUrl(path);
  let body;
  if (queryMethod) {
    url = appendQuery(url, data);
  } else if (data instanceof FormData) {
    body = data;
    headers.delete("Content-Type");
  } else if (data !== null && data !== undefined) {
    body = JSON.stringify(data);
    headers.set("Content-Type", "application/json");
  }

  const timeoutSignal = AbortSignal.timeout(options.timeout ?? config.requestTimeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  let response;
  try {
    response = await fetch(url, { method: normalizedMethod, headers, body, signal, credentials: "include" });
  } catch (cause) {
    const cancelled = options.signal?.aborted === true;
    const error = new Error(cancelled ? "請求已取消" : timeoutSignal.aborted ? "請求逾時，請稍後重試" : "無法連線，請檢查網路後重試");
    error.type = cancelled ? "cancelled" : timeoutSignal.aborted ? "timeout" : "network";
    error.cause = cause;
    throw error;
  }

  const text = response.status === 204 ? "" : await response.text();
  let result = null;
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = null;
    }
  }
  if (!response.ok) {
    const error = new Error(result?.message || `請求失敗（HTTP ${response.status}）`);
    error.httpCode = response.status;
    error.data = result?.data ?? {};
    error.fields = fieldErrors(error.data.errors);
    if (response.status === 401 && options.handleAuthError !== false && auth.isLogin()) {
      auth.clearUser();
      broadcastAuthSignal(AuthSignal.EXPIRED, true);
    }
    throw error;
  }
  return result;
};

export default { request, fieldErrors };


