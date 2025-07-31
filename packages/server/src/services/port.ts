import { db } from "@dokploy/server/db";
import {type apiCreatePort, applications, ports} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import {and, eq} from "drizzle-orm";
import {getRandomPort} from "@dokploy/server/utils/billing";

export type Port = typeof ports.$inferSelect;

export const createPort = async (input: typeof apiCreatePort._type, txo:any) => {
	const app = await (txo?txo:db).query.applications.findFirst({
		where: eq(applications.applicationId, input.applicationId),
		columns: {
			serverId: true
		}
	})

	const portList = await (txo?txo:db).query.ports.findMany({
		where: eq(applications.applicationId, input.applicationId),
	})
	if(portList.length >= 20){
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "映射端口数不能超过20个",
		});
	}

	let insertLoop = true;
	let num = 0;
	let newPort;
	while (insertLoop && num < 10) {
		try {
			const port = getRandomPort()
			newPort = await (txo?txo:db)
				.insert(ports)
				.values({
					...input,
					serverId: app?.serverId || "",
					publishedPort: port
				})
				.returning()
				.then((value:any) => value[0]);
			if(newPort){
				insertLoop = false;
			}
		}catch (error){

		}
	}

	if (!newPort) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Error input: Inserting port",
		});
	}

	return newPort;
};

export const finPortById = async (portId: string) => {
	const result = await db.query.ports.findFirst({
		where: eq(ports.portId, portId),
	});
	if (!result) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Port not found",
		});
	}
	return result;
};

export const removePortById = async (portId: string) => {
	const result = await db
		.delete(ports)
		.where(eq(ports.portId, portId))
		.returning();

	return result[0];
};

export const updatePortById = async (
	portId: string,
	portData: Partial<Port>,
) => {
	delete portData.publishedPort;
	const result = await db
		.update(ports)
		.set({
			...portData,
		})
		.where(eq(ports.portId, portId))
		.returning();

	return result[0];
};
