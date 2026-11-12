import request from "../helper/request.js";

export default {
  list: (query) => request.request("GET", "posts", query),
  mine: (query) => request.request("GET", "posts/mine", query),
  show: (id) => request.request("GET", `posts/${id}`),
  showMine: (id) => request.request("GET", `posts/mine/${id}`),
  create: (data) => request.request("POST", "posts", data),
  update: (id, data) => request.request("PUT", `posts/${id}`, data),
  destroy: (id) => request.request("DELETE", `posts/${id}`),
};
