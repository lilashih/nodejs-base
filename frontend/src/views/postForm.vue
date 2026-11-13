<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import postApi from "@src/api/postApi.js";
import config from "@src/config/config.js";

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === "postEdit");
const title = ref("");
const content = ref("");
const status = ref("draft");
const coverImage = ref(null);
const preview = ref("");
const fields = ref({});
const errorMessage = ref("");
const loading = ref(false);
const saving = ref(false);

const load = async () => {
  title.value = "";
  content.value = "";
  status.value = "draft";
  coverImage.value = null;
  preview.value = "";
  fields.value = {};
  errorMessage.value = "";
  if (!editing.value) return;
  loading.value = true;
  try {
    const post = (await postApi.showMine(route.params.id)).data.post;
    title.value = post.title;
    content.value = post.content;
    status.value = post.status;
    coverImage.value = post.coverImage;
    preview.value = post.coverImage || "";
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
};
watch(() => [route.name, route.params.id], load, { immediate: true });

const selectImage = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    fields.value = { ...fields.value, coverImage: "封面僅支援 JPG、PNG 或 WebP" };
    event.target.value = "";
    return;
  }
  if (file.size > config.maxImageSizeBytes) {
    fields.value = { ...fields.value, coverImage: "封面大小不可超過 2 MB" };
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    coverImage.value = reader.result;
    preview.value = reader.result;
    fields.value = { ...fields.value, coverImage: "" };
  };
  reader.onerror = () => { fields.value = { ...fields.value, coverImage: "讀取圖片失敗" }; };
  reader.readAsDataURL(file);
};

const removeImage = () => {
  coverImage.value = null;
  preview.value = "";
  const input = document.getElementById("coverImage");
  if (input) input.value = "";
};

const save = async () => {
  fields.value = {};
  errorMessage.value = "";
  if (!title.value.trim()) fields.value.title = "請輸入標題";
  if (!content.value.trim()) fields.value.content = "請輸入內容";
  if (Object.keys(fields.value).length) return;
  saving.value = true;
  try {
    const data = { title: title.value.trim(), content: content.value, status: status.value, coverImage: coverImage.value };
    if (editing.value) await postApi.update(route.params.id, data);
    else await postApi.create(data);
    await router.push({ name: "myPosts" });
  } catch (error) {
    fields.value = error.fields || {};
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
};

</script>

<template>
  <div class="editorPage">
    <RouterLink class="back" to="/my-posts">← 返回我的文章</RouterLink>
    <div class="pageTitle editorTitle"><div><span class="eyebrow">EDITOR</span><h1>{{ editing ? "編輯文章" : "新增文章" }}</h1><p>先把想法寫下來，準備好再發布。</p></div></div>
    <p v-if="loading" class="stateMessage" role="status">正在載入文章…</p>
    <form v-else class="editorLayout" @submit.prevent="save">
      <div class="editorMain">
        <p v-if="errorMessage" class="errorBanner" role="alert">{{ errorMessage }}</p>
        <div class="field"><label for="title">文章標題</label><input id="title" v-model="title" maxlength="255" placeholder="為文章取一個清楚的標題" required :aria-invalid="Boolean(fields.title)" /><small v-if="fields.title" class="fieldError">{{ fields.title }}</small></div>
        <div class="field">
          <label for="coverImage">封面圖片</label>
          <label v-if="!preview" class="coverUpload" for="coverImage"><span><strong>＋ 選擇封面圖片</strong>支援 JPG、PNG、WebP，最多 2 MB</span></label>
          <input id="coverImage" class="fileInput" type="file" accept="image/jpeg,image/png,image/webp" @change="selectImage" />
          <div v-if="preview" class="coverPreviewCard">
            <div class="coverPreviewMedia">
              <img :src="preview" alt="封面預覽" />
            </div>
            <div class="coverPreviewBar">
              <span class="coverPreviewHint">已選取封面圖片</span>
              <div class="coverPreviewActions">
                <label for="coverImage" class="button light coverActionBtn">更換圖片</label>
                <button class="button danger coverActionBtn" type="button" @click="removeImage">移除封面</button>
              </div>
            </div>
          </div>
          <small v-if="fields.coverImage" class="fieldError">{{ fields.coverImage }}</small>
        </div>
        <div class="field"><label for="content">文章內容</label><textarea id="content" v-model="content" rows="12" placeholder="從第一句開始，寫下你的想法。" required :aria-invalid="Boolean(fields.content)" /><small class="hint">使用段落讓內容更容易閱讀。</small><small v-if="fields.content" class="fieldError">{{ fields.content }}</small></div>
      </div>
      <aside class="editorSide" aria-label="發布設定">
        <h2>發布設定</h2><p>調整文章狀態後，再儲存變更。</p>
        <div class="field"><label for="status">文章狀態</label><select id="status" v-model="status"><option value="draft">草稿</option><option value="published">已發布</option></select></div>
        <div class="editorActions">
          <button class="button" type="submit" :disabled="saving">{{ saving ? "儲存中…" : editing ? "儲存" : "新增" }}</button>
          <RouterLink class="button light" to="/my-posts">取消</RouterLink>
        </div>
        <div class="editorTip"><span class="eyebrow">小提醒</span><p>草稿只會出現在「我的文章」；發布後，其他讀者就能在首頁看到。</p></div>
      </aside>
    </form>
  </div>
</template>
