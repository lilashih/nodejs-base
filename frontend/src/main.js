import { createApp } from "vue";
import app from "@src/app.vue";
import config from "@src/config/config.js";
import router from "@src/router/index.js";
import "@src/styles/main.css";

document.title = config.name;
createApp(app).use(router).mount("#app");

