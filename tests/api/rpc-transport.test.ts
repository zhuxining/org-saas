import { createRPCClient } from "@org-saas/api/client";
import { apiContract } from "@org-saas/api/contracts/index";
import {
  API_MAX_BODY_SIZE,
  createHTTPPlugins,
  type HTTPPluginContext,
} from "@org-saas/api/http-plugins";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { implement, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import pino from "pino";
import { describe, expect, it } from "vite-plus/test";

const origin = "https://app.example.com";
const logger = pino({ level: "silent" });
const implementer = implement(apiContract).$context<HTTPPluginContext>();

function setup() {
  let savedName = "Original";
  const router = {
    healthCheck: implementer.healthCheck.handler(() => "OK"),
    privateData: implementer.privateData.handler(() => ({
      message: "x".repeat(2000),
      user: { id: "user-1", name: savedName, email: "user@example.com", image: null },
    })),
    user: {
      updateProfile: implementer.user.updateProfile.handler(({ input }) => {
        if (input.name) savedName = input.name;
        return { status: true };
      }),
    },
  };
  const handler = new RPCHandler(router, {
    plugins: createHTTPPlugins({ origin, logger, protocol: "rpc" }),
  });

  const transport: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const { response } = await handler.handle(request, {
      prefix: "/rpc",
      context: { requestId: crypto.randomUUID() },
    });
    if (!response) throw new Error("No matching API endpoint");
    return response;
  };

  const openAPIHandler = new OpenAPIHandler(router, {
    plugins: createHTTPPlugins({ origin, logger, protocol: "openapi" }),
  });
  const openAPI = async (request: Request) => {
    const { response } = await openAPIHandler.handle(request, {
      prefix: "/rpc/api-docs",
      context: { requestId: crypto.randomUUID() },
    });
    if (!response) throw new Error("No matching OpenAPI endpoint");
    return response;
  };

  const client = (fetch: typeof globalThis.fetch = transport) =>
    createRPCClient(apiContract, { origin, url: "/rpc", fetch });

  return { client, transport, openAPI, getSavedName: () => savedName };
}

describe("OpenAPI 资料写入的请求边界", () => {
  it("POST 方法覆盖仍使用资料契约保存并返回结果", async () => {
    const api = setup();
    const response = await api.openAPI(
      new Request(`${origin}/rpc/api-docs/profile?method=PATCH`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated through OpenAPI" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: true });
    expect(api.getSavedName()).toBe("Updated through OpenAPI");
  });

  it("压缩后很小但解压超过上限的资料请求不能保存", async () => {
    const api = setup();
    const body = JSON.stringify({
      name: "Oversized submission",
      padding: "x".repeat(API_MAX_BODY_SIZE),
    });
    const compressed = await new Response(
      new Blob([body]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer();
    const response = await api.openAPI(
      new Request(`${origin}/rpc/api-docs/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
        body: compressed,
      }),
    );

    expect(response.status).toBe(413);
    expect(api.getSavedName()).toBe("Original");
  });
});

// These exercise application transport policy with the same contract and plugin factories as Web.
describe("RPC 查询与资料写入的传输策略", () => {
  it("查询遇到一次临时网络故障后仍能取得资料", async () => {
    const api = setup();
    let disconnected = true;
    const client = api.client((input, init) => {
      if (disconnected) {
        disconnected = false;
        return Promise.reject(new TypeError("Network connection lost"));
      }
      return api.transport(input, init);
    });

    const result = await client.privateData();
    expect(result.user.name).toBe("Original");
  });

  it("资料已保存但响应丢失时，不自动重复提交写操作", async () => {
    const api = setup();
    let writes = 0;
    const client = api.client(async (input, init) => {
      await api.transport(input, init);
      writes += 1;
      // Simulate a second submission overwriting a concurrently updated value.
      if (writes > 1) await api.client().user.updateProfile({ name: "Duplicate submission" });
      throw new TypeError("Response lost after commit");
    });

    await expect(client.user.updateProfile({ name: "Saved once" })).rejects.toThrow(
      "Response lost",
    );
    expect(api.getSavedName()).toBe("Saved once");
  });

  it("登录拒绝立即返回，不用重试结果替换访问拒绝", async () => {
    const api = setup();
    let rejected = false;
    const client = api.client((input, init) => {
      if (!rejected) {
        rejected = true;
        return Promise.reject(new ORPCError("UNAUTHORIZED"));
      }
      return api.transport(input, init);
    });

    await expect(client.privateData()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("并发查询在批处理和响应压缩后仍返回各自的完整结果", async () => {
    const api = setup();
    const client = api.client(async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Accept-Encoding", "gzip");
      const response = await api.transport(input, { ...init, headers });
      // Native browser fetch does this automatically; this in-process transport emulates it.
      if (response.headers.get("Content-Encoding") === "gzip" && response.body) {
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete("Content-Encoding");
        responseHeaders.delete("Content-Length");
        return new Response(response.body.pipeThrough(new DecompressionStream("gzip")), {
          status: response.status,
          headers: responseHeaders,
        });
      }
      return response;
    });

    const [health, first, second] = await Promise.all([
      client.healthCheck(),
      client.privateData(),
      client.privateData(),
    ]);
    expect(health).toBe("OK");
    expect(first.user.name).toBe("Original");
    expect(first.message).toHaveLength(2000);
    expect(second).toEqual(first);
  });
});
