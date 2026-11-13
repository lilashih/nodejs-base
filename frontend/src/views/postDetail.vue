<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import postApi from "@src/api/postApi.js";
import { useAuth } from "@src/composables/useAuth.js";

const route = useRoute();
const { user } = useAuth();
const post = ref(null);
const loading = ref(false);
const errorMessage = ref("");

const paragraphs = computed(() => String(post.value?.content || "").trim().split(/\n\s*\n/).filter(Boolean));

const load = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    post.value = (await postApi.show(route.params.id)).data.post;
  } catch (error) {
    errorMessage.value = error.message;
    post.value = null;
  } finally {
    loading.value = false;
  }
};
watch(() => route.params.id, load, { immediate: true });
</script>

<template>
  <div v-if="loading" class="stateMessage" role="status">正在載入文章…</div>
  <div v-else-if="errorMessage" class="stateMessage error" role="alert">{{ errorMessage }} <button class="textButton" type="button" @click="load">重試</button></div>
  <article v-else-if="post" class="article">
    <RouterLink class="back" to="/">← 返回文章列表</RouterLink>
    <header class="articleHead">
      <span class="eyebrow">閱讀文章</span>
      <h1>{{ post.title }}</h1>
      <div class="articleMeta">
        <span class="avatar" aria-hidden="true">{{ post.authorName?.charAt(0) || "作" }}</span>
        <span>{{ post.authorName }}</span>
        <span aria-hidden="true">·</span>
        <time :datetime="post.createdAt">{{ new Date(post.createdAt).toLocaleDateString("zh-TW") }}</time>
        <RouterLink v-if="user && Number(user.id) === Number(post.userId)" class="button light editArticle" :to="`/posts/${post.id}/edit`">編輯文章</RouterLink>
      </div>
    </header>

    <figure v-if="post.coverImage" class="articleCover realCover">
      <img :src="post.coverImage" :alt="`${post.title}的封面`" />
    </figure>
    <div v-else class="articleCover" role="img" aria-label="綠色與米色構成的抽象封面">
      <div class="art artOne" aria-hidden="true"></div>
    </div>

    <div class="prose articleText">
      <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
    </div>
    <RouterLink class="button light" to="/">← 繼續探索文章</RouterLink>
  </article>
</template>


