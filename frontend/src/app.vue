<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@src/composables/useAuth.js";
import config from "@src/config/config.js";

const router = useRouter();
const { user, logout } = useAuth();
const initial = computed(() => user.value?.name?.trim().charAt(0) || "我");

const signOut = async () => {
  try {
    await logout();
    await router.push({ name: "posts" });
  } catch (error) {
    window.alert(error.message);
  }
};
</script>

<template>
  <div class="siteShell">
    <header class="siteHeader">
      <div class="wrap headerRow">
        <RouterLink class="logo" to="/"><span class="logoMark" aria-hidden="true">✦</span>{{ config.name }}</RouterLink>
        <nav class="mainNav" aria-label="主要導覽">
          <RouterLink to="/" exact-active-class="active">探索文章</RouterLink>
          <template v-if="user">
            <RouterLink to="/my-posts" active-class="active">我的文章</RouterLink>
            <RouterLink class="navAction" to="/posts/create">＋ 寫文章</RouterLink>
          </template>
          <template v-else>
            <RouterLink to="/login" active-class="active">登入</RouterLink>
            <RouterLink class="navAction" to="/register">建立帳號</RouterLink>
          </template>
        </nav>
        <div v-if="user" class="accountMenu" aria-label="登入帳號">
          <span class="accountAvatar" aria-hidden="true">{{ initial }}</span>
          <span class="accountName">{{ user.name }}</span>
          <button class="logoutButton" type="button" @click="signOut">登出</button>
        </div>
      </div>
    </header>
    <main class="wrap siteMain"><RouterView /></main>
    <footer class="footer"><div class="wrap">{{ config.name }}</div></footer>
  </div>
</template>