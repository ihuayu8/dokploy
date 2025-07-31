import {createTRPCRouter, protectedProcedure} from "@/server/api/trpc";
import {addNewService, checkServiceAccess} from "@dokploy/server/services/user";
import {TRPCError} from "@trpc/server";
import {createApplication} from "@dokploy/server/services/application";
import {
    allApps,
    allTags,
    createApplicationTemplate,
    getMyApps,
    getTempUpVersions
} from "@dokploy/server/services/application-shop";
import {apiCreateApplicationShop, apiQueryTags} from "@dokploy/server/db/schema/application-shop";
import {PostgresError} from "postgres";
import {apiQueryTemp} from "@dokploy/server/db/schema";

export const applicationShopRouter = createTRPCRouter({
    // 创建应用模板
    createTemplate: protectedProcedure
        .input(apiCreateApplicationShop)
        .mutation(async ({input, ctx}) => {
            try {
                const info = await createApplicationTemplate(input, ctx.session.userId);
                return info;
            } catch (error: unknown) {
                console.error(error)
                // @ts-ignore
                if (error?.code === '23505') {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "创建失败，版本号已存在",
                        cause: error,
                    });
                }
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Error creating the application to shop",
                    cause: error,
                });
            }
        }),

    // 获取应用商店所有已上架应用
    allApps: protectedProcedure
        .input(apiQueryTags)
        .query
        (async ({input, ctx}) => {
            try {
                return allApps(input?.order);
            } catch (error: unknown) {
                console.log(error)
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Error creating the application to shop",
                    cause: error,
                });
            }
        }),
    // 获取标签列表
    allTags: protectedProcedure
        .query
        (async () => {
            try {
                return allTags();
            } catch (error: unknown) {
                console.log(error)
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Error querry",
                    cause: error,
                });
            }
        }),
    // 获取当前用户所有的应用
    getMyApps: protectedProcedure
        .query
        (async ({ctx}) => {
            try {
                return getMyApps(ctx.session.userId);
            } catch (error: unknown) {
                console.log(error)
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Error querry",
                    cause: error,
                });
            }
        }),
    // 获取指定模板的所有已上架版本
    getTempUpVersions: protectedProcedure
        .input(apiQueryTemp)
        .query
        (async ({input, ctx}) => {
            try {
                return getTempUpVersions(input.appShopId);
            } catch (error: unknown) {
                console.log(error)
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Error querry",
                    cause: error,
                });
            }
        }),
})
