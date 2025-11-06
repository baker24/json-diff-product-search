import { createRouter, createWebHistory } from "vue-router";
import JsonDiff from "../views/JsonDiff.vue";
import ProductSearch from "../views/ProductSearch.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/diff",
    },
    {
      path: "/diff",
      name: "diff",
      component: JsonDiff,
    },
    {
      path: "/search",
      name: "search",
      component: ProductSearch,
    },
  ],
});

export default router;
