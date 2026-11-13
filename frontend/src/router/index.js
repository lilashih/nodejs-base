import { createRouter, createWebHistory } from "vue-router";
import auth from "@src/config/auth.js";
import authApi from "@src/api/authApi.js";
import config from "@src/config/config.js";
import { subscribeAuthSignal } from "@src/channel/authChannel.js";
import postList from "@src/views/postList.vue";
import postDetail from "@src/views/postDetail.vue";
import postForm from "@src/views/postForm.vue";
import login from "@src/views/login.vue";
import register from "@src/views/register.vue";
import notFound from "@src/views/notFound.vue";

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

