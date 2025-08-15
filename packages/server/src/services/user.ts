import { db } from "@dokploy/server/db";
import {apikey, coupon, exchange, member, users_temp, voucher} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import {and, eq, sql} from "drizzle-orm";
import { auth } from "../lib/auth";

export type User = typeof users_temp.$inferSelect;

export const addNewProject = async (
	userId: string,
	projectId: string,
	organizationId: string,
) => {
	const userR = await findMemberById(userId, organizationId);

	await db
		.update(member)
		.set({
			accessedProjects: [...userR.accessedProjects, projectId],
		})
		.where(
			and(eq(member.id, userR.id), eq(member.organizationId, organizationId)),
		);
};

export const addNewService = async (
	userId: string,
	serviceId: string,
	organizationId: string,
) => {
	const userR = await findMemberById(userId, organizationId);
	await db
		.update(member)
		.set({
			accessedServices: [...userR.accessedServices, serviceId],
		})
		.where(
			and(eq(member.id, userR.id), eq(member.organizationId, organizationId)),
		);
};

export const canPerformCreationService = async (
	userId: string,
	projectId: string,
	organizationId: string,
) => {
	const { accessedProjects, canCreateServices } = await findMemberById(
		userId,
		organizationId,
	);
	const haveAccessToProject = accessedProjects.includes(projectId);

	if (canCreateServices && haveAccessToProject) {
		return true;
	}

	return false;
};

export const canPerformAccessService = async (
	userId: string,
	serviceId: string,
	organizationId: string,
) => {
	const { accessedServices } = await findMemberById(userId, organizationId);
	const haveAccessToService = accessedServices.includes(serviceId);

	if (haveAccessToService) {
		return true;
	}

	return false;
};

export const canPeformDeleteService = async (
	userId: string,
	serviceId: string,
	organizationId: string,
) => {
	const { accessedServices, canDeleteServices } = await findMemberById(
		userId,
		organizationId,
	);
	const haveAccessToService = accessedServices.includes(serviceId);

	if (canDeleteServices && haveAccessToService) {
		return true;
	}

	return false;
};

export const canPerformCreationProject = async (
	userId: string,
	organizationId: string,
) => {
	const { canCreateProjects } = await findMemberById(userId, organizationId);

	if (canCreateProjects) {
		return true;
	}

	return false;
};

export const canPerformDeleteProject = async (
	userId: string,
	organizationId: string,
) => {
	const { canDeleteProjects } = await findMemberById(userId, organizationId);

	if (canDeleteProjects) {
		return true;
	}

	return false;
};

export const canPerformAccessProject = async (
	userId: string,
	projectId: string,
	organizationId: string,
) => {
	const { accessedProjects } = await findMemberById(userId, organizationId);

	const haveAccessToProject = accessedProjects.includes(projectId);

	if (haveAccessToProject) {
		return true;
	}
	return false;
};

export const canAccessToTraefikFiles = async (
	userId: string,
	organizationId: string,
) => {
	const { canAccessToTraefikFiles } = await findMemberById(
		userId,
		organizationId,
	);
	return canAccessToTraefikFiles;
};

export const checkServiceAccess = async (
	userId: string,
	serviceId: string,
	organizationId: string,
	action = "access" as "access" | "create" | "delete",
) => {
	let hasPermission = false;
	switch (action) {
		case "create":
			hasPermission = await canPerformCreationService(
				userId,
				serviceId,
				organizationId,
			);
			break;
		case "access":
			hasPermission = await canPerformAccessService(
				userId,
				serviceId,
				organizationId,
			);
			break;
		case "delete":
			hasPermission = await canPeformDeleteService(
				userId,
				serviceId,
				organizationId,
			);
			break;
		default:
			hasPermission = false;
	}
	if (!hasPermission) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Permission denied",
		});
	}
};

export const checkProjectAccess = async (
	authId: string,
	action: "create" | "delete" | "access",
	organizationId: string,
	projectId?: string,
) => {
	let hasPermission = false;
	switch (action) {
		case "access":
			hasPermission = await canPerformAccessProject(
				authId,
				projectId as string,
				organizationId,
			);
			break;
		case "create":
			hasPermission = await canPerformCreationProject(authId, organizationId);
			break;
		case "delete":
			hasPermission = await canPerformDeleteProject(authId, organizationId);
			break;
		default:
			hasPermission = false;
	}
	if (!hasPermission) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Permission denied",
		});
	}
};

export const findMemberById = async (
	userId: string,
	organizationId: string,
) => {
	const result = await db.query.member.findFirst({
		where: and(
			eq(member.userId, userId),
			eq(member.organizationId, organizationId),
		),
		with: {
			user: true,
		},
	});

	if (!result) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Permission denied",
		});
	}
	return result;
};

export const updateUser = async (userId: string, userData: Partial<User>) => {
	const user = await db
		.update(users_temp)
		.set({
			...userData,
		})
		.where(eq(users_temp.id, userId))
		.returning()
		.then((res) => res[0]);

	return user;
};

export const createApiKey = async (
	userId: string,
	input: {
		name: string;
		prefix?: string;
		expiresIn?: number;
		metadata: {
			organizationId: string;
		};
		rateLimitEnabled?: boolean;
		rateLimitTimeWindow?: number;
		rateLimitMax?: number;
		remaining?: number;
		refillAmount?: number;
		refillInterval?: number;
	},
) => {
	const apiKey = await auth.createApiKey({
		body: {
			name: input.name,
			expiresIn: input.expiresIn,
			prefix: input.prefix,
			rateLimitEnabled: input.rateLimitEnabled,
			rateLimitTimeWindow: input.rateLimitTimeWindow,
			rateLimitMax: input.rateLimitMax,
			remaining: input.remaining,
			refillAmount: input.refillAmount,
			refillInterval: input.refillInterval,
			userId,
		},
	});

	if (input.metadata) {
		await db
			.update(apikey)
			.set({
				metadata: JSON.stringify(input.metadata),
			})
			.where(eq(apikey.id, apiKey.id));
	}
	return apiKey;
};

export const useExchange = async (
	userId: string,
	exchangeId: string,
) => {
	// 查询兑换码
	const exchangeInfo = await db.query.exchange.findFirst({
		where: and(
			eq(exchange.exchangeId, exchangeId),
		),
	});

	// 校验兑换码
	if(!exchangeInfo){
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "兑换码不存在",
		});
	}
	// 检查兑换码是否已被使用
	if(exchangeInfo.used >= exchangeInfo.count){
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "兑换码已被使用",
		});
	}
	// 检查兑换码是否过期
	if(exchangeInfo.expiryAt && exchangeInfo.expiryAt < new Date()){
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "兑换码已过期",
		});
	}

	// 检查用户是否已使用该兑换码
	if(exchangeInfo.type === '1'){
		const usedInfo = await db.query.voucher.findFirst({
			where: and(
				eq(voucher.userId, userId),
				eq(voucher.exchangeId, exchangeId),
			),
		});
		if(usedInfo){
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "您已使用该兑换码",
			});
		}
	}else if(exchangeInfo.type === '2'){
		const usedInfo = await db.query.coupon.findFirst({
			where: and(
				eq(coupon.userId, userId),
				eq(coupon.exchangeId, exchangeId),
			),
		});
		if(usedInfo){
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "您已使用该兑换码",
			});
		}
	}


	let expiry = new Date();

	if(exchangeInfo.effectiveDays){
		expiry.setDate(expiry.getDate() + exchangeInfo.effectiveDays);
	} else {
		// @ts-ignore
		expiry.setDate(exchangeInfo.expiryAt || new Date());
	}


	// 判断兑换码类型
	if(exchangeInfo.type === "1"){
		// 处理代金卷兑换
		const voucherInfo = await db.insert(voucher).values({
			// @ts-ignore
			...exchangeInfo,
			balance: exchangeInfo.amount,
			userId: userId,
			amount: exchangeInfo.amount,
			expiry: expiry,
			vName: exchangeInfo.name
		}).returning().then((res) => res[0]);
		// 更新兑换码使用次数
		await db.update(exchange).set({
			used: sql`${exchangeInfo.used} + 1`,
		}).where(eq(exchange.exchangeId, exchangeId));
		return voucherInfo;
	} else if(exchangeInfo.type === "2"){
		// 处理优惠券兑换
		// @ts-ignore
		const couponInfo = await db.insert(coupon).values({
			// @ts-ignore
			...exchangeInfo,
			userId: userId,
			amount: exchangeInfo.amount,
			type: exchangeInfo.couponType,
			expiredAt: expiry,
		}).returning().then((res) => res[0]);
		// 更新兑换码使用次数
		await db.update(exchange).set({
			used: sql`${exchangeInfo.used} + 1`,
		}).where(eq(exchange.exchangeId, exchangeId));
		return couponInfo;
	}


}
