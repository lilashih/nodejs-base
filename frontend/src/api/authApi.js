import request from "../helper/request.js";

export default {
  login: (data) => request.request("POST", "auth/session/login", data, { handleAuthError: false }),
  register: (data) => request.request("POST", "auth/session/register", data, { handleAuthError: false }),
  logout: () => request.request("POST", "auth/session/logout"),
  me: () => request.request("GET", "auth/me"),
};
