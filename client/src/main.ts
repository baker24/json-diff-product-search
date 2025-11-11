import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { lazyDirective } from "./directives/lazy";

const app = createApp(App);
app.directive("lazy", lazyDirective);
app.use(router).mount("#app");
