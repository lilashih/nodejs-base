<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@src/composables/useAuth.js";

const router = useRouter();
const { register } = useAuth();
const name = ref("");
const email = ref("");
const password = ref("");
const fields = ref({});
const errorMessage = ref("");
const saving = ref(false);

const submit = async () => {
  saving.value = true;
  fields.value = {};
  errorMessage.value = "";
  try {
    await register({ name: name.value, email: email.value, password: password.value });
    await router.replace({ name: "myPosts" });
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
    <div class="authHeading"><p class="eyebrow">JOIN US</p><h1>建立帳號</h1><p>開始撰寫並分享文章。</p></div>
    <form class="authCard" @submit.prevent="submit">
      <p v-if="errorMessage" class="errorBanner" role="alert">{{ errorMessage }}</p>
      <div class="field"><label for="name">姓名</label><input id="name" v-model="name" maxlength="100" autocomplete="name" required /><small v-if="fields.name" class="fieldError">{{ fields.name }}</small></div>
      <div class="field"><label for="email">電子郵件</label><input id="email" v-model="email" type="email" autocomplete="email" required /><small v-if="fields.email" class="fieldError">{{ fields.email }}</small></div>
      <div class="field"><label for="password">密碼</label><input id="password" v-model="password" type="password" minlength="8" maxlength="72" autocomplete="new-password" required /><small v-if="fields.password" class="fieldError">{{ fields.password }}</small></div>
      <button class="button" type="submit" :disabled="saving">{{ saving ? "建立中…" : "建立帳號" }}</button>
      <p class="formFootnote">已有帳號？ <RouterLink to="/login">前往登入</RouterLink></p>
    </form>
  </section>
</template>

