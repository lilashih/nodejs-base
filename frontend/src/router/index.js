import { createRouter, createWebHistory } from "vue-router";
import auth from "../config/auth.js";
import authApi from "../api/authApi.js";
import config from "../config/config.js";
import { subscribeAuthSignal } from "../channel/authChannel.js";
import postList from "../views/postList.vue";
import postDetail from "../views/postDetail.vue";
import postForm from "../views/postForm.vue";
import login from "../views/login.vue";
import register from "../views/register.vue";
import notFound from "../views/notFound.vue";

const router = createRouter({
  history: createWebHistory(config.url.view),
  routes: [
    { path: "/", name: "posts", component: postList },
    { path: "/my-posts", name: "myPosts", component: postList, meta: { auth: true } },
    { path: "/login", name: "login", component: login },
    { path: "/register", name: "register", component: register },
    { path: "/posts/create", name: "postCreate", component: postForm, meta: { auth: true } },
    { path: "/posts/:id/edit", name: "postEdit", component: postForm, meta: { auth: true } },
    { path: "/posts/:id", name: "postDetail", component: postDetail },
    { path: "/:pathMatch(.*)*", name: "notFound", component: notFound },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  await auth.initialize(authApi.me);
  if (to.meta.auth && !auth.isLogin()) return { name: "login", query: { redirect: to.fullPath } };
  if ((to.name === "login" || to.name === "register") && auth.isLogin()) return { name: "myPosts" };
});

window.addEventListener("auth-expired", () => {
  if (router.currentRoute.value.name !== "login") {
    router.push({ name: "login", query: { redirect: router.currentRoute.value.fullPath, expired: "1" } });
  }
});

subscribeAuthSignal(() => {
  window.location.reload();
});

export default router;

