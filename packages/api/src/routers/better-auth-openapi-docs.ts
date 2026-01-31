import { auth } from "@org-sass/auth";
import { publicProcedure } from "../index";

/**
 * Better-Auth API 路由
 */
export const betterAuthOpenAPIDocsRouter = {
	/**
	 * 获取 Better-Auth OpenAPI Schema
	 *
	 * 返回所有 Better-Auth 端点的 OpenAPI 规范
	 */
	getOpenAPISchema: publicProcedure.handler(async () => {
		return auth.api.generateOpenAPISchema();
	}),
};
