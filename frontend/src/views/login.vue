<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@src/composables/useAuth.js";

const route = useRoute();
const router = useRouter();
const { login } = useAuth();
const email = ref("");
const password = ref("");
const fields = ref({});
const errorMessage = ref("");
const saving = ref(false);

const submit = async () => {
  saving.value = true;
  errorMessage.value = "";
  fields.value = {};
  try {
    await login({ email: email.value, password: password.value });
    const redirect = String(route.query.redirect || "");
    await router.replace(redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/my-posts");
  } catch (error) {
    errorMessage.value = error.message;
    fields.value = error.fields || {};
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <section class="authPage">
    <div class="authHeading"><p class="eyebrow">WELCOME BACK</p><h1>登入帳號</h1><p>繼續管理你的文章。</p></div>
    <form class="authCard" @submit.prevent="submit">
      <p v-if="route.query.expired" class="errorBanner">登入狀態已過期，請重新登入。</p>
      <p v-if="errorMessage" class="errorBanner" role="alert">{{ errorMessage }}</p>
      <div class="field"><label for="email">電子郵件</label><input id="email" v-model="email" type="email" autocomplete="email" required /><small v-if="fields.email" class="fieldError">{{ fields.email }}</small></div>
      <div class="field"><label for="password">密碼</label><input id="password" v-model="password" type="password" autocomplete="current-password" required /><small v-if="fields.password" class="fieldError">{{ fields.password }}</small></div>
      <button class="button" type="submit" :disabled="saving">{{ saving ? "登入中…" : "登入" }}</button>
      <p class="formFootnote">還沒有帳號？ <RouterLink to="/register">前往註冊</RouterLink></p>
    </form>
  </section>
</template>

