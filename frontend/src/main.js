import { createApp } from "vue";
import app from "./app.vue";
import config from "./config/config.js";
import router from "./router/index.js";
import "./styles/main.css";

document.title = config.name;
createApp(app).use(router).mount("#app");

