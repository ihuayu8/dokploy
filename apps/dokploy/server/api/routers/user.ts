import {
	IS_CLOUD,
	createApiKey,
	findAdmin,
	findNotificationById,
	findOrganizationById,
	findUserById,
	getUserByToken,
	removeUserById,
	sendEmailNotification,
	updateUser, useExchange,
} from "@dokploy/server";
import { db } from "@dokploy/server/db";
import {nanoid} from "nanoid";
import {
	account,
	apiAssignPermissions,
	apiFindOneToken,
	apiUpdateUser,
	apikey,
	invitation,
	member, users_temp, voucher, rechargeOrder, noticeCheck, notice,
    coupon
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import * as bcrypt from "bcrypt";
import {and, asc, desc, eq, gt, gte, lte, sql} from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "../trpc";

const apiCreateApiKey = z.object({
	name: z.string().min(1),
	prefix: z.string().optional(),
	expiresIn: z.number().optional(),
	metadata: z.object({
		organizationId: z.string(),
	}),
	// Rate limiting
	rateLimitEnabled: z.boolean().optional(),
	rateLimitTimeWindow: z.number().optional(),
	rateLimitMax: z.number().optional(),
	// Request limiting
	remaining: z.number().optional(),
	refillAmount: z.number().optional(),
	refillInterval: z.number().optional(),
});

export const userRouter = createTRPCRouter({
	all: adminProcedure.query(async ({ ctx }) => {
		return await db.query.member.findMany({
			where: eq(member.organizationId, ctx.session.activeOrganizationId),
			with: {
				user: true,
			},
			orderBy: [asc(member.createdAt)],
		});
	}),
	one: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const memberResult = await db.query.member.findFirst({
				where: and(
					eq(member.userId, input.userId),
					eq(member.organizationId, ctx.session?.activeOrganizationId || ""),
				),
				with: {
					user: true,
				},
			});

			// If user not found in the organization, deny access
			if (!memberResult) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found in this organization",
				});
			}

			// Allow access if:
			// 1. User is requesting their own information
			// 2. User has owner role (admin permissions) AND user is in the same organization
			if (memberResult.userId !== ctx.user.id && ctx.user.role !== "owner") {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not authorized to access this user",
				});
			}

			return memberResult;
		}),
	get: protectedProcedure.query(async ({ ctx }) => {
		const memberResult = await db.query.member.findFirst({
			where: and(
				eq(member.userId, ctx.user.id),
				eq(member.organizationId, ctx.session?.activeOrganizationId || ""),
			),
			with: {
				user: {
					with: {
						apiKeys: true,
					},
				},
			},
		});

		return memberResult;
	}),
	// 获取用户余额
	getBalance: protectedProcedure.query(async ({ ctx }) => {
		const userInfo = await db.query.users_temp.findFirst({
			where: eq(users_temp.id, ctx.user.id),
			columns: {
				balance: true,
				id: true
			}
		})

		return userInfo;
	}),
	// 获取通知公告
	getNotice: protectedProcedure.query(async ({ ctx }) => {
		const notices = await db
			.select()
			.from(notice)
			.leftJoin(noticeCheck, and(
				eq(notice.noticeId, noticeCheck.noticeId),
				eq(noticeCheck.userId, ctx.user.id)
			))
			.limit(5)
			.orderBy(desc(notice.noticeId))

		return notices;
	}),
	// 用户公告已读
	readNotice: protectedProcedure.input(z.object({
		noticeId: z.number()
	})).mutation(async ({ input, ctx }) => {
		try{
			await db.insert(noticeCheck).values({
				noticeId: input.noticeId,
				userId: ctx.user.id,
			})
		}catch (e){
		}
	}),
	// 获取用户代金券列表
	getVouchers: protectedProcedure.query(async ({ ctx }) => {
		const voucherList = await db.query.voucher.findMany({
			where: and(
				eq(voucher.userId, ctx.user.id),
				eq(voucher.status, "0"),
			)
		})

		return voucherList;
	}),
	// 获取用户优惠券列表
	getCoupons: protectedProcedure.query(async ({ ctx }) => {
		const couponList = await db.query.coupon.findMany({
			where: and(
				eq(coupon.userId, ctx.user.id),
				eq(coupon.status, "0"),
			)
		})

		return couponList;
	}),
	// 用户充值-生成订单并返回支付二维码
	recharge: protectedProcedure.input(z.object({
		amount: z.number().min(0)
	})).mutation(async ({ input, ctx }) => {
		// 生成订单号
		const orderId = nanoid();
		let res;
		try{
			res = await fetch("http://atte.ihuayu8.cn/pay/gen_order", {
				method: "POST",
				body: JSON.stringify({
					name: "用户充值",
					amount: input.amount.toString(),
					userId: "",
					mercId: "",
					mercNum: "",
					callUrl: "http://35.212.135.32:3000/api/payment?token=huayu5355408",
					thirdOrderId: orderId
				})
			})
		}catch (e){
			console.error(e)
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "创建订单失败，请稍后再试！",
			});
		}
		const data = await res?.json();
		if(data.code !== 200){
			console.error(res)
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "创建订单失败，请稍后再试！",
			});
		}

		//插入订单表
		await db.insert(rechargeOrder).values({
			id: orderId,
			amount: input.amount || 0,
			payAmount: input.amount,
			userId: ctx.session.userId || "",
			status: "0",
			couponId: "",
		})

		return {
			orderId,
			payUrl: data.data.payUrl
		};
	}),
	// 查询订单状态
	getOrderStatus: protectedProcedure
		.input(z.object({
			orderId: z.string()
		}))
		.query(async ({ ctx,input }) => {
			const order = await db.query.rechargeOrder.findFirst({
				where: eq(rechargeOrder.id, input.orderId),
				columns: {
					status: true,
					amount: true,
				}
			})

		return order;
	}),
	// 获取可用优惠券列表
	getCouponList: protectedProcedure
		.input(z.object({
			amount: z.number()
		}))
		.query(async ({ ctx,input }) => {
		const couponList = await db.query.coupon.findMany({
			where: and(
				gt(coupon.expiredAt, new Date()),
				eq(coupon.status, "0"),
				lte(coupon.threshold, input.amount)
			)
		})

		return couponList;
	}),
	// 兑换码兑换
	exchangeCode: protectedProcedure.input(z.object({
		code: z.string()
	})).mutation(async ({ input, ctx }) => {
		try{
			return await useExchange(ctx.user.id, input.code)
		}catch (e){
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: e.message,
			});
		}

	}),
	haveRootAccess: protectedProcedure.query(async ({ ctx }) => {
		if (!IS_CLOUD) {
			return false;
		}
		if (
			process.env.USER_ADMIN_ID === ctx.user.id ||
			ctx.session?.impersonatedBy === process.env.USER_ADMIN_ID
		) {
			return true;
		}
		return false;
	}),
	getBackups: adminProcedure.query(async ({ ctx }) => {
		const memberResult = await db.query.member.findFirst({
			where: and(
				eq(member.userId, ctx.user.id),
				eq(member.organizationId, ctx.session?.activeOrganizationId || ""),
			),
			with: {
				user: {
					with: {
						backups: {
							with: {
								destination: true,
								deployments: true,
							},
						},
						apiKeys: true,
					},
				},
			},
		});

		return memberResult?.user;
	}),
	getServerMetrics: protectedProcedure.query(async ({ ctx }) => {
		const memberResult = await db.query.member.findFirst({
			where: and(
				eq(member.userId, ctx.user.id),
				eq(member.organizationId, ctx.session?.activeOrganizationId || ""),
			),
			with: {
				user: true,
			},
		});

		return memberResult?.user;
	}),
	update: protectedProcedure
		.input(apiUpdateUser)
		.mutation(async ({ input, ctx }) => {
			if (input.password || input.currentPassword) {
				const currentAuth = await db.query.account.findFirst({
					where: eq(account.userId, ctx.user.id),
				});
				const correctPassword = bcrypt.compareSync(
					input.currentPassword || "",
					currentAuth?.password || "",
				);

				if (!correctPassword) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Current password is incorrect",
					});
				}

				if (!input.password) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "New password is required",
					});
				}
				await db
					.update(account)
					.set({
						password: bcrypt.hashSync(input.password, 10),
					})
					.where(eq(account.userId, ctx.user.id));
			}
			return await updateUser(ctx.user.id, input);
		}),
	getUserByToken: publicProcedure
		.input(apiFindOneToken)
		.query(async ({ input }) => {
			return await getUserByToken(input.token);
		}),
	getMetricsToken: protectedProcedure.query(async ({ ctx }) => {
		const user = await findUserById(ctx.user.ownerId);
		return {
			serverIp: user.serverIp,
			enabledFeatures: user.enablePaidFeatures,
			metricsConfig: user?.metricsConfig,
		};
	}),
	remove: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			if (IS_CLOUD) {
				return true;
			}
			return await removeUserById(input.userId);
		}),
	assignPermissions: adminProcedure
		.input(apiAssignPermissions)
		.mutation(async ({ input, ctx }) => {
			try {
				const organization = await findOrganizationById(
					ctx.session?.activeOrganizationId || "",
				);

				if (organization?.ownerId !== ctx.user.ownerId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to assign permissions",
					});
				}

				const { id, ...rest } = input;

				await db
					.update(member)
					.set({
						...rest,
					})
					.where(
						and(
							eq(member.userId, input.id),
							eq(
								member.organizationId,
								ctx.session?.activeOrganizationId || "",
							),
						),
					);
			} catch (error) {
				throw error;
			}
		}),
	getInvitations: protectedProcedure.query(async ({ ctx }) => {
		return await db.query.invitation.findMany({
			where: and(
				eq(invitation.email, ctx.user.email),
				gt(invitation.expiresAt, new Date()),
				eq(invitation.status, "pending"),
			),
			with: {
				organization: true,
			},
		});
	}),

	getContainerMetrics: protectedProcedure
		.input(
			z.object({
				url: z.string(),
				token: z.string(),
				appName: z.string(),
				dataPoints: z.string(),
			}),
		)
		.query(async ({ input }) => {
			try {
				if (!input.appName) {
					throw new Error(
						[
							"No Application Selected:",
							"",
							"Make Sure to select an application to monitor.",
						].join("\n"),
					);
				}
				const url = new URL(`${input.url}/metrics/containers`);
				url.searchParams.append("limit", input.dataPoints);
				url.searchParams.append("appName", input.appName);
				const response = await fetch(url.toString(), {
					headers: {
						Authorization: `Bearer ${input.token}`,
					},
				});
				if (!response.ok) {
					throw new Error(
						`Error ${response.status}: ${response.statusText}. Please verify that the application "${input.appName}" is running and this service is included in the monitoring configuration.`,
					);
				}

				const data = await response.json();
				if (!Array.isArray(data) || data.length === 0) {
					throw new Error(
						[
							`No monitoring data available for "${input.appName}". This could be because:`,
							"",
							"1. The container was recently started - wait a few minutes for data to be collected",
							"2. The container is not running - verify its status",
							"3. The service is not included in your monitoring configuration",
						].join("\n"),
					);
				}
				return data as {
					containerId: string;
					containerName: string;
					containerImage: string;
					containerLabels: string;
					containerCommand: string;
					containerCreated: string;
				}[];
			} catch (error) {
				throw error;
			}
		}),

	generateToken: protectedProcedure.mutation(async () => {
		return "token";
	}),

	deleteApiKey: protectedProcedure
		.input(
			z.object({
				apiKeyId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				const apiKeyToDelete = await db.query.apikey.findFirst({
					where: eq(apikey.id, input.apiKeyId),
				});

				if (!apiKeyToDelete) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "API key not found",
					});
				}

				if (apiKeyToDelete.userId !== ctx.user.id) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not authorized to delete this API key",
					});
				}

				await db.delete(apikey).where(eq(apikey.id, input.apiKeyId));
				return true;
			} catch (error) {
				throw error;
			}
		}),

	createApiKey: protectedProcedure
		.input(apiCreateApiKey)
		.mutation(async ({ input, ctx }) => {
			const apiKey = await createApiKey(ctx.user.id, input);
			return apiKey;
		}),

	checkUserOrganizations: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			const organizations = await db.query.member.findMany({
				where: eq(member.userId, input.userId),
			});

			return organizations.length;
		}),
	sendInvitation: adminProcedure
		.input(
			z.object({
				invitationId: z.string().min(1),
				notificationId: z.string().min(1),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (IS_CLOUD) {
				return;
			}

			const notification = await findNotificationById(input.notificationId);

			const email = notification.email;

			const currentInvitation = await db.query.invitation.findFirst({
				where: eq(invitation.id, input.invitationId),
			});

			if (!email) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Email notification not found",
				});
			}

			const admin = await findAdmin();
			const host =
				process.env.NODE_ENV === "development"
					? "http://localhost:3000"
					: admin.user.host;
			const inviteLink = `${host}/invitation?token=${input.invitationId}`;

			const organization = await findOrganizationById(
				ctx.session.activeOrganizationId,
			);

			try {
				await sendEmailNotification(
					{
						...email,
						toAddresses: [currentInvitation?.email || ""],
					},
					"Invitation to join organization",
					`
				<p>You are invited to join ${organization?.name || "organization"} on Dokploy. Click the link to accept the invitation: <a href="${inviteLink}">Accept Invitation</a></p>
					`,
				);
			} catch (error) {
				console.log(error);
				throw error;
			}
			return inviteLink;
		}),
});
