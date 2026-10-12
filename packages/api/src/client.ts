import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import {
  BatchLinkPlugin,
  DedupeLinkPlugin,
  RequestCompressionLinkPlugin,
  RetryLinkPlugin,
  TimeoutLinkPlugin,
} from "@orpc/client/plugins";
import {
  getProcedureContractOrThrow,
  type RouterContract,
  type RouterContractClient,
} from "@orpc/contract";
import { RequestValidationLinkPlugin, ResponseValidationLinkPlugin } from "@orpc/contract/plugins";
import { getOpenAPIMeta } from "@orpc/openapi";

export function createRPCClient<T extends RouterContract>(
  contract: T,
  options: {
    origin?: string;
    url: `/${string}`;
    fetch?: typeof globalThis.fetch;
  },
): RouterContractClient<T> {
  const isQuery = (path: readonly string[]) =>
    getOpenAPIMeta(getProcedureContractOrThrow(contract, path))?.method === "GET";

  const networkErrors = new WeakSet<Error>();

  const link = new RPCLink({
    origin: options.origin,
    url: options.url,
    plugins: [
      new RequestValidationLinkPlugin(contract),
      new ResponseValidationLinkPlugin(contract),
      new RetryLinkPlugin({
        default: {
          retry: ({ path }) => (isQuery(path) ? 1 : 0),
          retryDelay: 500,
          shouldRetry: ({ error }) =>
            (error instanceof Error && networkErrors.has(error)) ||
            (error instanceof ORPCError &&
              ["BAD_GATEWAY", "SERVICE_UNAVAILABLE", "GATEWAY_TIMEOUT"].includes(error.code)),
        },
      }),
      new TimeoutLinkPlugin({ timeout: 35_000 }),
      // RPC stays on POST; read safety comes from the contract rather than the transport method.
      new DedupeLinkPlugin({
        filter: ({ path }) => isQuery(path),
        groups: [{ condition: () => true, context: {} }],
      }),
      new BatchLinkPlugin({
        filter: ({ path }) => isQuery(path),
        // Current query contracts return finite JSON DTOs, allowing batch response compression.
        mode: "buffered",
        maxSize: 10,
        groups: [{ condition: () => true, context: {} }],
      }),
      new RequestCompressionLinkPlugin(),
    ],
    async fetch(url, init) {
      try {
        return await (options.fetch ?? globalThis.fetch)(url, { ...init, credentials: "include" });
      } catch (error) {
        // Only fetch failures qualify; a TypeError during decoding or validation is not a network failure.
        if (error instanceof TypeError && !init?.signal?.aborted) networkErrors.add(error);
        throw error;
      }
    },
  });

  // Fetch advertises response compression and decompresses it natively.
  return createORPCClient(link);
}
