import { redirect } from "@tanstack/react-router";

/**
 * 403 Forbidden - 无权限访问
 * 用于权限不足时显示 403 页面而非重定向
 */
export class ForbiddenError extends Error {
	public readonly statusCode = 403;
	public readonly code = "FORBIDDEN";

	constructor(
		message = "You do not have permission to access this resource",
		public readonly details?: {
			requiredRole?: string;
			requiredPermission?: { resource: string; actions: string[] };
		},
	) {
		super(message);
		this.name = "ForbiddenError";
	}
}

/**
 * 401 Unauthorized - 未认证
 * 用于未登录时重定向到登录页
 */
export class UnauthorizedError extends Error {
	public readonly statusCode = 401;
	public readonly code = "UNAUTHORIZED";

	constructor(
		message = "You must be logged in to access this resource",
		public readonly redirectTo: string = "/login",
	) {
		super(message);
		this.name = "UnauthorizedError";
	}

	toRedirect() {
		return redirect({
			to: this.redirectTo,
			search: { redirect: window.location.href },
		});
	}
}

/**
 * 404 Not Found - 资源不存在
 */
export class NotFoundError extends Error {
	public readonly statusCode = 404;
	public readonly code = "NOT_FOUND";

	constructor(message = "Resource not found") {
		super(message);
		this.name = "NotFoundError";
	}
}

/**
 * 判断错误是否为权限相关错误
 */
export function isAuthError(
	error: unknown,
): error is UnauthorizedError | ForbiddenError {
	return error instanceof UnauthorizedError || error instanceof ForbiddenError;
}
