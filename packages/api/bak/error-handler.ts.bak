import { ORPCError } from "@orpc/server";

/**
 * Better-Auth 错误代码映射到 oRPC 错误类型
 * 根据错误类型返回适当的 HTTP 状态码
 */
export function mapAuthErrorToORPC(error: unknown): ORPCError<string, unknown> {
	// 检查是否在开发环境
	const isDevelopment = process.env.NODE_ENV === "development";

	// 处理 Better-Auth 标准错误
	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		// 用户未找到
		if (
			message.includes("user not found") ||
			message.includes("not found") ||
			message.includes("does not exist")
		) {
			return new ORPCError("NOT_FOUND", {
				message: isDevelopment ? error.message : "Resource not found",
			}) as ORPCError<string, unknown>;
		}

		// 邮箱已存在 / 冲突
		if (
			message.includes("already exists") ||
			message.includes("email already") ||
			message.includes("duplicate") ||
			message.includes("already taken")
		) {
			return new ORPCError("CONFLICT", {
				message: isDevelopment ? error.message : "Resource already exists",
			}) as ORPCError<string, unknown>;
		}

		// 无效凭据 / 验证失败
		if (
			message.includes("invalid") ||
			message.includes("incorrect") ||
			message.includes("credential") ||
			message.includes("password") ||
			message.includes("unauthorized")
		) {
			return new ORPCError("BAD_REQUEST", {
				message: isDevelopment ? error.message : "Invalid request data",
			}) as ORPCError<string, unknown>;
		}

		// 权限不足
		if (
			message.includes("forbidden") ||
			message.includes("permission") ||
			message.includes("unauthorized")
		) {
			return new ORPCError("FORBIDDEN", {
				message: isDevelopment ? error.message : "Insufficient permissions",
			}) as ORPCError<string, unknown>;
		}

		// 速率限制
		if (message.includes("rate limit") || message.includes("too many")) {
			return new ORPCError("TOO_MANY_REQUESTS", {
				message: isDevelopment
					? error.message
					: "Too many requests, please try again later",
			}) as ORPCError<string, unknown>;
		}
	}

	// 默认返回内部服务器错误
	return new ORPCError("INTERNAL_SERVER_ERROR", {
		message: isDevelopment
			? error instanceof Error
				? error.message
				: "Unknown error"
			: "An error occurred. Please try again later.",
	}) as ORPCError<string, unknown>;
}

/**
 * 包装异步函数，自动处理错误映射
 */
export function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
	return fn().catch((error) => {
		throw mapAuthErrorToORPC(error);
	});
}
