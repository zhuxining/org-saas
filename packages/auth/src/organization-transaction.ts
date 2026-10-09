import { AsyncLocalStorage } from "node:async_hooks";

import { runWithTransaction } from "@better-auth/core/context";

type Adapter = Parameters<typeof runWithTransaction>[0];

type AuthWithAdapter = {
  $context: Promise<unknown>;
  handler: (request: Request) => Promise<Response>;
  fetch: (request: Request) => Promise<Response>;
  api: unknown;
};

export const ownerMutationPaths = new Set([
  "/organization/add-member",
  "/organization/invite-member",
  "/organization/accept-invitation",
  "/organization/update-member-role",
  "/organization/remove-member",
  "/organization/leave",
  "/organization/transfer-ownership",
]);

export const accountDeletionPaths = new Set([
  "/delete-user",
  "/delete-user/callback",
  "/admin/remove-user",
]);

const transactionalHttpPaths = new Set([
  "/organization/create",
  ...ownerMutationPaths,
  ...accountDeletionPaths,
]);

const ownerMutationApiMethods = new Set([
  "createOrganization",
  "addMember",
  "createInvitation",
  "acceptInvitation",
  "updateMemberRole",
  "removeMember",
  "leaveOrganization",
  "transferOrganizationOwnership",
  "deleteUser",
  "deleteUserCallback",
  "removeUser",
]);

type TransactionCallback = (transactionAdapter: Adapter) => Promise<unknown>;

function createTransactionAwareAdapter(baseAdapter: Adapter): Adapter {
  const storage = new AsyncLocalStorage<Adapter>();
  const baseTransaction = baseAdapter.transaction;
  if (typeof baseTransaction !== "function") return baseAdapter;

  let adapterProxy: Adapter;
  adapterProxy = new Proxy(baseAdapter, {
    get(target, property) {
      if (property === "transaction") {
        return (callback: TransactionCallback) => {
          if (storage.getStore()) return callback(adapterProxy);
          return baseTransaction.call(target, (transactionAdapter) =>
            storage.run(transactionAdapter as Adapter, () => callback(adapterProxy)),
          );
        };
      }
      const currentAdapter = storage.getStore() ?? target;
      const value = Reflect.get(currentAdapter, property, currentAdapter);
      return typeof value === "function" ? value.bind(currentAdapter) : value;
    },
  });
  return adapterProxy;
}

class RollbackResponse extends Error {
  constructor(readonly response: Response) {
    super("The authentication endpoint returned an error response.");
  }
}

function isOwnerMutationPath(pathname: string): boolean {
  return [...transactionalHttpPaths].some((path) => pathname.endsWith(path));
}

/**
 * Keeps one database transaction active through Better Auth's HTTP adapter
 * rebinding, and applies the same boundary to direct server API calls.
 */
export function withOrganizationMutationTransactions<AuthType extends AuthWithAdapter>(
  auth: AuthType,
): AuthType {
  const adapterReady = auth.$context.then((context) => {
    const authContext = context as { adapter: Adapter };
    const adapter = createTransactionAwareAdapter(authContext.adapter);
    authContext.adapter = adapter;
    return adapter;
  });
  const run = async <Result>(operation: () => Promise<Result>) =>
    runWithTransaction(await adapterReady, operation);

  const handler = async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    if (!isOwnerMutationPath(path)) {
      await adapterReady;
      return Reflect.apply(auth.handler, auth, [request]);
    }

    try {
      return await run(async () => {
        const response = await Reflect.apply(auth.handler, auth, [request]);
        if (!response.ok) throw new RollbackResponse(response);
        return response;
      });
    } catch (error) {
      if (error instanceof RollbackResponse) return error.response;
      throw error;
    }
  };

  const apiTarget = auth.api as object;
  const api = new Proxy(apiTarget, {
    get(target, property, receiver) {
      const method = Reflect.get(target, property, receiver);
      if (
        typeof property !== "string" ||
        !ownerMutationApiMethods.has(property) ||
        typeof method !== "function"
      ) {
        return method;
      }
      return new Proxy(method, {
        apply(targetMethod, _thisArg, args) {
          return run(() => Promise.resolve(Reflect.apply(targetMethod, apiTarget, args)));
        },
      });
    },
  });

  return new Proxy(auth, {
    get(target, property, receiver) {
      if (property === "handler" || property === "fetch") return handler;
      if (property === "api") return api;
      return Reflect.get(target, property, receiver);
    },
  });
}
