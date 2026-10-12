import { ORPCError } from "@orpc/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createQueryClient } from "../../apps/web/src/utils/orpc";

const { addToast, toastModulePath } = await vi.hoisted(async () => {
  const { createRequire } = await import("node:module");
  const resolveFromWeb = createRequire(`${process.cwd()}/apps/web/package.json`);
  return {
    toastModulePath: resolveFromWeb.resolve("@org-saas/ui/components/toast"),
    addToast: vi.fn<
      (feedback: {
        title: string;
        description?: string;
        actionProps?: { children: string; onClick: () => void };
      }) => string
    >(() => "test-toast"),
  };
});

// 隔离同构客户端初始化和 Toast 渲染，保留真实查询缓存与错误反馈行为。
vi.mock("@org-saas/api/context", () => ({ createContext: () => ({}) }));
vi.mock("@org-saas/api/index", () => ({ standardLimiter: {} }));
vi.mock("@org-saas/api/routers/index", () => ({ appRouter: {} }));
vi.mock(toastModulePath, () => ({ toast: { add: addToast } }));
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: () => ({ client: () => () => ({}) }) }),
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeaders: () => new Headers() }));

afterEach(() => {
  addToast.mockClear();
});

describe("查询失败反馈", () => {
  it("首次加载失败由页面处理，不产生全局 Toast", async () => {
    const queryClient = createQueryClient();
    try {
      await expect(
        queryClient.fetchQuery({
          queryKey: ["first-load"],
          queryFn: () => Promise.reject(new Error("private details")),
        }),
      ).rejects.toThrow("private details");
      expect(addToast.mock.calls).toEqual([]);
    } finally {
      queryClient.clear();
    }
  });

  it.each([
    [new ORPCError("FORBIDDEN", { message: "您无权访问此组织" }), "您无权访问此组织"],
    [
      new ORPCError("INTERNAL_SERVER_ERROR", { message: "private details" }),
      "暂时无法完成请求，请稍后重试",
    ],
    [new TypeError("private rendering details"), "暂时无法完成请求，请稍后重试"],
  ])("刷新失败保留旧数据并展示安全提示：%s", async (error, title) => {
    const queryClient = createQueryClient();
    const queryKey = ["refresh-feedback"];
    queryClient.setQueryData(queryKey, "已有数据");
    try {
      await expect(
        queryClient.fetchQuery({
          queryKey,
          staleTime: 0,
          queryFn: () => Promise.reject(error),
        }),
      ).rejects.toThrow(error.message);
      expect(queryClient.getQueryData(queryKey)).toBe("已有数据");
      expect(addToast.mock.calls[0]?.[0].title).toBe(title);
    } finally {
      queryClient.clear();
    }
  });

  it("业务故障提示提供与响应一致的问题编号", async () => {
    const queryClient = createQueryClient();
    const queryKey = ["failure-reference"];
    queryClient.setQueryData(queryKey, "已有数据");
    try {
      await expect(
        queryClient.fetchQuery({
          queryKey,
          staleTime: 0,
          queryFn: () =>
            Promise.reject(
              new ORPCError("INTERNAL_SERVER_ERROR", {
                message: "private database details",
                data: { requestId: "7d77f1b0-0720-40f3-b03c-f3497317b372" },
              }),
            ),
        }),
      ).rejects.toThrow("private database details");
      expect(addToast.mock.calls[0]?.[0].description).toBe(
        "问题编号：7d77f1b0-0720-40f3-b03c-f3497317b372",
      );
    } finally {
      queryClient.clear();
    }
  });

  it("触发失败提示的重试操作后，重新获取对应查询并恢复数据", async () => {
    const queryClient = createQueryClient();
    const queryKey = ["retry-refresh"];
    queryClient.setQueryData(queryKey, "旧数据");
    queryClient.setQueryData(["unrelated"], "其他页面数据");
    let unavailable = true;
    try {
      await expect(
        queryClient.fetchQuery({
          queryKey,
          staleTime: 0,
          queryFn: async () => {
            if (unavailable) throw new Error("private upstream details");
            return "新数据";
          },
        }),
      ).rejects.toThrow("private upstream details");
      const action = addToast.mock.calls[0]?.[0].actionProps;
      expect(action?.children).toBe("重试");
      unavailable = false;
      action?.onClick();
      await vi.waitFor(() => expect(queryClient.getQueryData(queryKey)).toBe("新数据"));
      expect(queryClient.getQueryData(["unrelated"])).toBe("其他页面数据");
    } finally {
      queryClient.clear();
    }
  });
});
