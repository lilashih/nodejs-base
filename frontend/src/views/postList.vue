<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import postApi from "@src/api/postApi.js";
import config from "@src/config/config.js";

const route = useRoute();
const router = useRouter();
const mine = computed(() => route.name === "myPosts");
const keyword = ref("");
const status = ref("");
const posts = ref([]);
const pagination = ref(null);
const loading = ref(false);
const errorMessage = ref("");
const deleteError = ref("");
const deletingId = ref(null);

const readPage = () => Math.max(1, Number.parseInt(route.query.page, 10) || 1);
const formatDate = (value) => value ? new Date(value).toLocaleDateString("zh-TW") : "";
const detailLink = (post) => `/posts/${post.id}`;

const load = async () => {
  loading.value = true;
  errorMessage.value = "";
  keyword.value = String(route.query.keyword || "");
  status.value = mine.value ? String(route.query.status || "") : "";
  try {
    const query = { page: readPage(), perPage: config.pageSize, keyword: keyword.value };
    if (mine.value && status.value) query.status = status.value;
    const result = await (mine.value ? postApi.mine(query) : postApi.list(query));
    posts.value = result.data.posts;
    pagination.value = result.data.pagination;
  } catch (error) {
    errorMessage.value = error.message;
    posts.value = [];
    pagination.value = null;
  } finally {
    loading.value = false;
  }
};

watch(() => [route.name, route.query.page, route.query.keyword, route.query.status], load, { immediate: true });

const search = () => router.push({
  name: route.name,
  query: {
    keyword: keyword.value || undefined,
    status: mine.value ? status.value || undefined : undefined,
  },
});
const changePage = (page) => router.push({ name: route.name, query: { ...route.query, page } });
const changeStatus = (value) => {
  status.value = value;
  search();
};

const destroy = async (post) => {
  if (!window.confirm(`確定要刪除「${post.title}」嗎？此操作無法復原。`)) return;
  deletingId.value = post.id;
  deleteError.value = "";
  try {
    await postApi.destroy(post.id);
    if (posts.value.length === 1 && readPage() > 1) await changePage(readPage() - 1);
    else await load();
  } catch (error) {
    deleteError.value = error.message;
  } finally {
    deletingId.value = null;
  }
};
</script>

<template>
  <template v-if="!mine">
    <section class="hero" aria-labelledby="heroTitle">
      <div class="heroCopy">
        <span class="eyebrow">閱讀，從這裡開始</span>
        <h1 id="heroTitle">留一點時間，<br />給值得讀的文字。</h1>
        <p>探索創作者的想法與觀察，在日常裡找到新的視角。</p>
      </div>
      <div class="heroVisual" aria-hidden="true"><div class="visualCard"></div></div>
    </section>
    <div class="sectionTop">
      <div><span class="eyebrow">DISCOVER</span><h2>探索文章</h2></div>
      <p>精選內容，每一篇都值得慢慢讀。</p>
    </div>
  </template>
  <div v-else class="pageTitle">
    <div><span class="eyebrow">WORKSPACE</span><h1>我的文章</h1><p>在這裡整理草稿與已發布的作品。</p></div>
    <RouterLink class="button" to="/posts/create">＋ 新增文章</RouterLink>
  </div>

  <form class="searchArea" @submit.prevent="search">
    <label class="searchBox">
      <span aria-hidden="true">⌕</span>
      <input v-model="keyword" type="search" maxlength="100" :placeholder="mine ? '搜尋我的文章' : '搜尋標題或內容'" :aria-label="mine ? '搜尋我的文章' : '搜尋標題或內容'" />
    </label>
    <button class="button" type="submit">搜尋</button>
  </form>

  <div v-if="mine" class="listToolbar">
    <div class="filters" role="group" aria-label="文章狀態篩選">
      <button class="pill" :class="{ active: status === '' }" :aria-pressed="status === ''" type="button" @click="changeStatus('')">全部</button>
      <button class="pill" :class="{ active: status === 'draft' }" :aria-pressed="status === 'draft'" type="button" @click="changeStatus('draft')">草稿</button>
      <button class="pill" :class="{ active: status === 'published' }" :aria-pressed="status === 'published'" type="button" @click="changeStatus('published')">已發布</button>
    </div>
    <p>依最近建立排序</p>
  </div>
  <p v-if="deleteError" class="errorBanner" role="alert">{{ deleteError }}</p>

  <p v-if="loading" class="stateMessage" role="status">正在載入文章…</p>
  <div v-else-if="errorMessage" class="stateMessage error" role="alert">{{ errorMessage }} <button class="textButton" type="button" @click="load">重試</button></div>
  <div v-else-if="!posts.length" class="stateMessage">
    <p>{{ mine ? "目前沒有符合條件的文章。" : "目前沒有文章。" }}</p>
    <RouterLink v-if="mine" class="button" to="/posts/create">開始寫文章</RouterLink>
  </div>
  <template v-else-if="mine">
    <section class="manageList" aria-label="我的文章列表">
      <article v-for="(post, index) in posts" :key="post.id" class="manageItem">
        <img v-if="post.coverImage" class="manageArt coverImage" :src="post.coverImage" :alt="`${post.title}的封面`" />
        <div v-else class="art manageArt" :class="['artOne', 'artTwo', 'artThree'][index % 3]" aria-hidden="true"></div>
        <div class="manageInfo">
          <span class="status" :class="{ draft: post.status === 'draft' }">{{ post.status === "draft" ? "草稿" : "已發布" }}</span>
          <h2>{{ post.title }}</h2>
          <p>{{ post.status === "draft" ? "上次編輯" : "發布於" }} {{ formatDate(post.updatedAt || post.createdAt) }}</p>
        </div>
        <div class="manageActions">
          <RouterLink class="button light" :to="`/posts/${post.id}/edit`">編輯</RouterLink>
          <button class="button danger" type="button" :disabled="deletingId !== null" @click="destroy(post)">{{ deletingId === post.id ? "刪除中…" : "刪除" }}</button>
        </div>
      </article>
    </section>
  </template>
  <section v-else class="postGrid" aria-label="文章列表">
    <article v-for="(post, index) in posts" :key="post.id" class="postCard">
      <RouterLink :to="detailLink(post)" :aria-label="`閱讀：${post.title}`">
        <img v-if="post.coverImage" class="cardCoverImage" :src="post.coverImage" :alt="`${post.title}的封面`" />
        <div v-else class="art" :class="['artOne', 'artTwo', 'artThree'][index % 3]" aria-hidden="true"></div>
      </RouterLink>
      <div class="cardBody">
        <div class="meta"><span>{{ post.authorName }}</span><span>{{ formatDate(post.createdAt) }}</span></div>
        <h3><RouterLink :to="detailLink(post)">{{ post.title }}</RouterLink></h3>
        <p>{{ post.content }}</p>
        <RouterLink class="readLink" :to="detailLink(post)">閱讀文章 →</RouterLink>
      </div>
    </article>
  </section>

  <nav v-if="pagination && pagination.lastPage > 1" class="pagination" aria-label="文章分頁">
    <button class="button light" type="button" :disabled="pagination.currentPage <= 1" @click="changePage(pagination.currentPage - 1)">上一頁</button>
    <span>第 {{ pagination.currentPage }} / {{ pagination.lastPage }} 頁</span>
    <button class="button light" type="button" :disabled="pagination.currentPage >= pagination.lastPage" @click="changePage(pagination.currentPage + 1)">下一頁</button>
  </nav>
</template>


