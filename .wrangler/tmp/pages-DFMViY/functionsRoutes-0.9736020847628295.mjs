import { onRequestOptions as __api_chat_js_onRequestOptions } from "D:\\Desktop\\AI agent\\骰子\\letitflow\\functions\\api\\chat.js"
import { onRequestPost as __api_chat_js_onRequestPost } from "D:\\Desktop\\AI agent\\骰子\\letitflow\\functions\\api\\chat.js"

export const routes = [
    {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_chat_js_onRequestOptions],
    },
  {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_js_onRequestPost],
    },
  ]