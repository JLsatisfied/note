import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/daily" },
    {
      path: "/daily",
      name: "daily",
      component: () => import("@/views/Daily.vue")
    },
    {
      path: "/weekly",
      name: "weekly",
      component: () => import("@/views/Weekly.vue")
    },
    {
      path: "/history",
      name: "history",
      component: () => import("@/views/History.vue")
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/Settings.vue")
    }
  ]
});

export default router;
