import { docker } from "@dokploy/server/constants";
import { db } from "@dokploy/server/db";
import {
	type apiCreateApplication, apiFindMonitoringStats,
	applications, applicationShopVersion, applicationShopDomains,
	buildAppName, buildVolumeName, appliationShopMounts, mounts,
	applicationShopports, server
} from "@dokploy/server/db/schema";
import { getAdvancedStats } from "@dokploy/server/monitoring/utils";
import {
	buildApplication,
	getBuildCommand,
	mechanizeDockerContainer,
} from "@dokploy/server/utils/builders";
import { sendBuildErrorNotifications } from "@dokploy/server/utils/notifications/build-error";
import { sendBuildSuccessNotifications } from "@dokploy/server/utils/notifications/build-success";
import { execAsyncRemote } from "@dokploy/server/utils/process/execAsync";
import {
	cloneBitbucketRepository,
	getBitbucketCloneCommand,
} from "@dokploy/server/utils/providers/bitbucket";
import {
	buildDocker,
	buildRemoteDocker,
} from "@dokploy/server/utils/providers/docker";
import {
	cloneGitRepository,
	getCustomGitCloneCommand,
} from "@dokploy/server/utils/providers/git";
import {
	cloneGiteaRepository,
	getGiteaCloneCommand,
} from "@dokploy/server/utils/providers/gitea";
import {
	cloneGithubRepository,
	getGithubCloneCommand,
} from "@dokploy/server/utils/providers/github";
import {
	cloneGitlabRepository,
	getGitlabCloneCommand,
} from "@dokploy/server/utils/providers/gitlab";
import { createTraefikConfig } from "@dokploy/server/utils/traefik/application";
import { TRPCError } from "@trpc/server";
import {and, eq, sql} from "drizzle-orm";
import { encodeBase64 } from "../utils/docker/utils";
import { getDokployUrl } from "./admin";
import {
	createDeployment,
	createDeploymentPreview,
	updateDeploymentStatus,
} from "./deployment";
import {createDomain, type Domain, getDomainHost} from "./domain";
import {
	createPreviewDeploymentComment,
	getIssueComment,
	issueCommentExists,
	updateIssueComment,
} from "./github";
import {
	findPreviewDeploymentById,
	updatePreviewDeployment,
} from "./preview-deployment";
import { validUniqueServerAppName } from "./project";
import { createRollback } from "./rollbacks";
import {setRealStand} from "@dokploy/server/utils/billing";
import {z} from "zod";
import {getContainerState} from "@dokploy/server/monitoring/service";
import {generateRandomDomain} from "@dokploy/server/templates";
import {findServerById} from "@dokploy/server/services/server";
import {createPort} from "@dokploy/server/services/port";
export type Application = typeof applications.$inferSelect;

export const createApplication = async (
	input: typeof apiCreateApplication._type,
) => {
	const appName = buildAppName("app", input.appName);

	const valid = await validUniqueServerAppName(appName);
	if (!valid) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Application with this 'AppName' already exists",
		});
	}

	// 设置实际资源规格
	const cSize = await setRealStand(input)

	//如果使用模板
	let templateInfo : any;
	if(input.useTemplate){
		templateInfo = await db.query.applicationShopVersion.findFirst({
			where: and(
				eq(applicationShopVersion.appShopId, input.appShopId || 0),
				eq(applicationShopVersion.versionId, input.versionId || "")
			)
		})
	}

	
	return await db.transaction(async (tx) => {
		// 创建应用
		const newApplication = await tx
			.insert(applications)
			.values({
				...templateInfo,
				...input,
				appName,
				...cSize
			})
			.returning()
			.then((value) => value[0]);

		if(input.useTemplate){
			// 创建域名
			const domainList = await tx.query.applicationShopDomains.findMany({
				where:eq(applicationShopDomains.versionId, input.versionId || "")
			})
			if(domainList.length > 0){
				const server = await findServerById(newApplication?.serverId || "");
				for (const item of domainList){
					let tmp:any = {...item};
					delete tmp.domainId;
					tmp.host = generateRandomDomain({
						serverIp: server.ipAddress,
						projectName: newApplication?.appName || "",
					})
					tmp.applicationId= newApplication?.applicationId
					await createDomain(tmp, tx)
				}
			}

			// 创建数据卷
			const mountList = await tx.query.appliationShopMounts.findMany({
				where:eq(appliationShopMounts.versionId, input.versionId || "")
			})
			if(mountList.length > 0){
				const shopMountList : any = []
				mountList.forEach(item => {
					let tmp:any = {...item};
					delete tmp.mountId;
					shopMountList.push({
						...tmp,
						volumeName: buildVolumeName(),
						applicationId: newApplication?.applicationId
					})
				})
				await tx.insert(mounts).values(shopMountList)
			}

			// 创建端口
			const portList = await tx.query.applicationShopports.findMany({
				where:eq(applicationShopports.versionId, input.versionId || "")
			})
			if(portList.length > 0){
				for(const item of portList){
					let tmp:any = {...item};
					delete tmp.portId;
					tmp.applicationId = newApplication?.applicationId
					await createPort(tmp, tx)
				}
			}
		}

		if (!newApplication) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Error creating the application",
			});
		}

		if (process.env.NODE_ENV === "development") {
			createTraefikConfig(newApplication.appName);
		}

		return newApplication;
	});
};

export const findApplicationById = async (applicationId: string, txo : any) => {
	const application = await (txo?txo:db).query.applications.findFirst({
		where: eq(applications.applicationId, applicationId),
		with: {
			project: true,
			domains: true,
			deployments: true,
			mounts: true,
			redirects: true,
			security: true,
			ports: true,
			registry: true,
			gitlab: true,
			github: true,
			bitbucket: true,
			gitea: true,
			server: true,
			previewDeployments: true,
		},
	});
	if (!application) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Application not found",
		});
	}
	return application;
};

export const findApplicationByName = async (appName: string) => {
	const application = await db.query.applications.findFirst({
		where: eq(applications.appName, appName),
	});

	return application;
};

export const updateApplication = async (
	applicationId: string,
	applicationData: Partial<Application>,
) => {
	const serverInfo = await db.query.applications.findFirst({
		where:eq(applications.applicationId, applicationId),
		columns:{
			serverId: true
		}
	})
	const { appName, ...rest } = applicationData;
	applicationData.serverId = serverInfo?.serverId
	// 设置实际资源规格
	let cSize = null;
	if(applicationData.stand){
		cSize = await setRealStand(applicationData)
	}
	const application = await db
		.update(applications)
		.set({
			...rest,
			...cSize
		})
		.where(eq(applications.applicationId, applicationId))
		.returning();

	return application[0];
};

export const updateApplicationStatus = async (
	applicationId: string,
	applicationStatus: Application["applicationStatus"],
) => {
	const application = await db
		.update(applications)
		.set({
			applicationStatus: applicationStatus,
		})
		.where(eq(applications.applicationId, applicationId))
		.returning();

	return application;
};

export const deployApplication = async ({
	applicationId,
	titleLog = "Manual deployment",
	descriptionLog = "",
}: {
	applicationId: string;
	titleLog: string;
	descriptionLog: string;
}) => {
	const application = await findApplicationById(applicationId, null);

	const buildLink = `${await getDokployUrl()}/dashboard/project/${application.projectId}/services/application/${application.applicationId}?tab=deployments`;
	const deployment = await createDeployment({
		applicationId: applicationId,
		title: titleLog,
		description: descriptionLog,
	});

	try {
		if (application.sourceType === "github") {
			await cloneGithubRepository({
				...application,
				logPath: deployment.logPath,
			});
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "gitlab") {
			await cloneGitlabRepository(application, deployment.logPath);
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "gitea") {
			await cloneGiteaRepository(application, deployment.logPath);
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "bitbucket") {
			await cloneBitbucketRepository(application, deployment.logPath);
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "docker") {
			await buildDocker(application, deployment.logPath);
		} else if (application.sourceType === "git") {
			await cloneGitRepository(application, deployment.logPath);
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "drop") {
			await buildApplication(application, deployment.logPath);
		}

		await updateDeploymentStatus(deployment.deploymentId, "done");
		await updateApplicationStatus(applicationId, "done");

		if (application.rollbackActive) {
			const tagImage =
				application.sourceType === "docker"
					? application.dockerImage
					: application.appName;
			await createRollback({
				appName: tagImage || "",
				deploymentId: deployment.deploymentId,
			});
		}

		await sendBuildSuccessNotifications({
			projectName: application.project.name,
			applicationName: application.name,
			applicationType: "application",
			buildLink,
			organizationId: application.project.organizationId,
			domains: application.domains,
		});
	} catch (error) {
		await updateDeploymentStatus(deployment.deploymentId, "error");
		await updateApplicationStatus(applicationId, "error");
		await sendBuildErrorNotifications({
			projectName: application.project.name,
			applicationName: application.name,
			applicationType: "application",
			// @ts-ignore
			errorMessage: error?.message || "Error building",
			buildLink,
			organizationId: application.project.organizationId,
		});

		throw error;
	}

	return true;
};

export const rebuildApplication = async ({
	applicationId,
	titleLog = "Rebuild deployment",
	descriptionLog = "",
}: {
	applicationId: string;
	titleLog: string;
	descriptionLog: string;
}) => {
	const application = await findApplicationById(applicationId, null);

	const deployment = await createDeployment({
		applicationId: applicationId,
		title: titleLog,
		description: descriptionLog,
	});

	try {
		if (application.sourceType === "github") {
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "gitlab") {
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "bitbucket") {
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "docker") {
			await buildDocker(application, deployment.logPath);
		} else if (application.sourceType === "git") {
			await buildApplication(application, deployment.logPath);
		} else if (application.sourceType === "drop") {
			await buildApplication(application, deployment.logPath);
		}
		await updateDeploymentStatus(deployment.deploymentId, "done");
		await updateApplicationStatus(applicationId, "done");
	} catch (error) {
		await updateDeploymentStatus(deployment.deploymentId, "error");
		await updateApplicationStatus(applicationId, "error");
		throw error;
	}

	return true;
};

export const deployRemoteApplication = async ({
	applicationId,
	titleLog = "Manual deployment",
	descriptionLog = "",
}: {
	applicationId: string;
	titleLog: string;
	descriptionLog: string;
}) => {
	const application = await findApplicationById(applicationId, null);

	const buildLink = `${await getDokployUrl()}/dashboard/project/${application.projectId}/services/application/${application.applicationId}?tab=deployments`;
	const deployment = await createDeployment({
		applicationId: applicationId,
		title: titleLog,
		description: descriptionLog,
	});

	try {
		if (application.serverId) {
			let command = "set -e;";
			if (application.sourceType === "github") {
				command += await getGithubCloneCommand({
					...application,
					serverId: application.serverId,
					logPath: deployment.logPath,
				});
			} else if (application.sourceType === "gitlab") {
				command += await getGitlabCloneCommand(application, deployment.logPath);
			} else if (application.sourceType === "bitbucket") {
				command += await getBitbucketCloneCommand(
					application,
					deployment.logPath,
				);
			} else if (application.sourceType === "gitea") {
				command += await getGiteaCloneCommand(application, deployment.logPath);
			} else if (application.sourceType === "git") {
				command += await getCustomGitCloneCommand(
					application,
					deployment.logPath,
				);
			} else if (application.sourceType === "docker") {
				command += await buildRemoteDocker(application, deployment.logPath);
			}

			if (application.sourceType !== "docker") {
				command += getBuildCommand(application, deployment.logPath);
			}
			await execAsyncRemote(application.serverId, command);
			await mechanizeDockerContainer(application);
		}

		await updateDeploymentStatus(deployment.deploymentId, "done");
		await updateApplicationStatus(applicationId, "done");

		// 部署成功后扣减资源
		if(application.currentReplicas !== application.replicas || application.currentStand !== application.stand){
			await db.transaction(async (tx) => {
				// 计算预扣减资源量
				const standList = await tx.query.stand.findMany()
				const currentRsc = standList.find(item=>item.id === application.currentStand)?.resource || 0
				const rsc = standList.find(item=>item.id === application.stand)?.resource || 0
				const previewResource = (application.replicas * rsc) - (application.currentReplicas * currentRsc)

				// @ts-ignore
				await tx.update(server).set({
					resourceUsed: sql`${server.resourceUsed} + ${previewResource}`
				}).where(eq(server.serverId, application.serverId))
					.returning()
				await tx.update(applications).set({
					currentStand: application.stand,
					currentReplicas: application.replicas
				}).where(eq(applications.applicationId, application.applicationId)).returning()
			})
		}

		if (application.rollbackActive) {
			const tagImage =
				application.sourceType === "docker"
					? application.dockerImage
					: application.appName;
			await createRollback({
				appName: tagImage || "",
				deploymentId: deployment.deploymentId,
			});
		}

		await sendBuildSuccessNotifications({
			projectName: application.project.name,
			applicationName: application.name,
			applicationType: "application",
			buildLink,
			organizationId: application.project.organizationId,
			domains: application.domains,
		});
	} catch (error) {
		// @ts-ignore
		const encodedContent = encodeBase64(error?.message);

		await execAsyncRemote(
			application.serverId,
			`
			echo "\n\n===================================EXTRA LOGS============================================" >> ${deployment.logPath};
			echo "Error occurred ❌, check the logs for details." >> ${deployment.logPath};
			echo "${encodedContent}" | base64 -d >> "${deployment.logPath}";`,
		);

		await updateDeploymentStatus(deployment.deploymentId, "error");
		await updateApplicationStatus(applicationId, "error");
		await sendBuildErrorNotifications({
			projectName: application.project.name,
			applicationName: application.name,
			applicationType: "application",
			// @ts-ignore
			errorMessage: error?.message || "Error building",
			buildLink,
			organizationId: application.project.organizationId,
		});

		throw error;
	}

	return true;
};

export const deployPreviewApplication = async ({
	applicationId,
	titleLog = "Preview Deployment",
	descriptionLog = "",
	previewDeploymentId,
}: {
	applicationId: string;
	titleLog: string;
	descriptionLog: string;
	previewDeploymentId: string;
}) => {
	const application = await findApplicationById(applicationId, null);

	const deployment = await createDeploymentPreview({
		title: titleLog,
		description: descriptionLog,
		previewDeploymentId: previewDeploymentId,
	});

	const previewDeployment =
		await findPreviewDeploymentById(previewDeploymentId);

	await updatePreviewDeployment(previewDeploymentId, {
		createdAt: new Date().toISOString(),
	});

	const previewDomain = getDomainHost(previewDeployment?.domain as Domain);
	const issueParams = {
		owner: application?.owner || "",
		repository: application?.repository || "",
		issue_number: previewDeployment.pullRequestNumber,
		comment_id: Number.parseInt(previewDeployment.pullRequestCommentId),
		githubId: application?.githubId || "",
	};
	try {
		const commentExists = await issueCommentExists({
			...issueParams,
		});
		if (!commentExists) {
			const result = await createPreviewDeploymentComment({
				...issueParams,
				previewDomain,
				appName: previewDeployment.appName,
				githubId: application?.githubId || "",
				previewDeploymentId,
			});

			if (!result) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Pull request comment not found",
				});
			}

			issueParams.comment_id = Number.parseInt(result?.pullRequestCommentId);
		}
		const buildingComment = getIssueComment(
			application.name,
			"running",
			previewDomain,
		);
		await updateIssueComment({
			...issueParams,
			body: `### Dokploy Preview Deployment\n\n${buildingComment}`,
		});
		application.appName = previewDeployment.appName;
		application.env = `${application.previewEnv}\nDOKPLOY_DEPLOY_URL=${previewDeployment?.domain?.host}`;
		application.buildArgs = application.previewBuildArgs;

		if (application.sourceType === "github") {
			await cloneGithubRepository({
				...application,
				appName: previewDeployment.appName,
				branch: previewDeployment.branch,
				logPath: deployment.logPath,
			});
			await buildApplication(application, deployment.logPath);
		}
		const successComment = getIssueComment(
			application.name,
			"success",
			previewDomain,
		);
		await updateIssueComment({
			...issueParams,
			body: `### Dokploy Preview Deployment\n\n${successComment}`,
		});
		await updateDeploymentStatus(deployment.deploymentId, "done");
		await updatePreviewDeployment(previewDeploymentId, {
			previewStatus: "done",
		});
	} catch (error) {
		const comment = getIssueComment(application.name, "error", previewDomain);
		await updateIssueComment({
			...issueParams,
			body: `### Dokploy Preview Deployment\n\n${comment}`,
		});
		await updateDeploymentStatus(deployment.deploymentId, "error");
		await updatePreviewDeployment(previewDeploymentId, {
			previewStatus: "error",
		});
		throw error;
	}

	return true;
};

export const deployRemotePreviewApplication = async ({
	applicationId,
	titleLog = "Preview Deployment",
	descriptionLog = "",
	previewDeploymentId,
}: {
	applicationId: string;
	titleLog: string;
	descriptionLog: string;
	previewDeploymentId: string;
}) => {
	const application = await findApplicationById(applicationId, null);

	const deployment = await createDeploymentPreview({
		title: titleLog,
		description: descriptionLog,
		previewDeploymentId: previewDeploymentId,
	});

	const previewDeployment =
		await findPreviewDeploymentById(previewDeploymentId);

	await updatePreviewDeployment(previewDeploymentId, {
		createdAt: new Date().toISOString(),
	});

	const previewDomain = getDomainHost(previewDeployment?.domain as Domain);
	const issueParams = {
		owner: application?.owner || "",
		repository: application?.repository || "",
		issue_number: previewDeployment.pullRequestNumber,
		comment_id: Number.parseInt(previewDeployment.pullRequestCommentId),
		githubId: application?.githubId || "",
	};
	try {
		const commentExists = await issueCommentExists({
			...issueParams,
		});
		if (!commentExists) {
			const result = await createPreviewDeploymentComment({
				...issueParams,
				previewDomain,
				appName: previewDeployment.appName,
				githubId: application?.githubId || "",
				previewDeploymentId,
			});

			if (!result) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Pull request comment not found",
				});
			}

			issueParams.comment_id = Number.parseInt(result?.pullRequestCommentId);
		}
		const buildingComment = getIssueComment(
			application.name,
			"running",
			previewDomain,
		);
		await updateIssueComment({
			...issueParams,
			body: `### Dokploy Preview Deployment\n\n${buildingComment}`,
		});
		application.appName = previewDeployment.appName;
		application.env = `${application.previewEnv}\nDOKPLOY_DEPLOY_URL=${previewDeployment?.domain?.host}`;
		application.buildArgs = application.previewBuildArgs;

		if (application.serverId) {
			let command = "set -e;";
			if (application.sourceType === "github") {
				command += await getGithubCloneCommand({
					...application,
					appName: previewDeployment.appName,
					branch: previewDeployment.branch,
					serverId: application.serverId,
					logPath: deployment.logPath,
				});
			}

			command += getBuildCommand(application, deployment.logPath);
			await execAsyncRemote(application.serverId, command);
			await mechanizeDockerContainer(application);
		}

		const successComment = getIssueComment(
			application.name,
			"success",
			previewDomain,
		);
		await updateIssueComment({
			...issueParams,
			body: `### Dokploy Preview Deployment\n\n${successComment}`,
		});
		await updateDeploymentStatus(deployment.deploymentId, "done");
		await updatePreviewDeployment(previewDeploymentId, {
			previewStatus: "done",
		});
	} catch (error) {
		const comment = getIssueComment(application.name, "error", previewDomain);
		await updateIssueComment({
			...issueParams,
			body: `### Dokploy Preview Deployment\n\n${comment}`,
		});
		await updateDeploymentStatus(deployment.deploymentId, "error");
		await updatePreviewDeployment(previewDeploymentId, {
			previewStatus: "error",
		});
		throw error;
	}

	return true;
};

export const rebuildRemoteApplication = async ({
	applicationId,
	titleLog = "Rebuild deployment",
	descriptionLog = "",
}: {
	applicationId: string;
	titleLog: string;
	descriptionLog: string;
}) => {
	const application = await findApplicationById(applicationId, null);

	const deployment = await createDeployment({
		applicationId: applicationId,
		title: titleLog,
		description: descriptionLog,
	});

	try {
		if (application.serverId) {
			if (application.sourceType !== "docker") {
				let command = "set -e;";
				command += getBuildCommand(application, deployment.logPath);
				await execAsyncRemote(application.serverId, command);
			}
			await mechanizeDockerContainer(application);
		}
		await updateDeploymentStatus(deployment.deploymentId, "done");
		await updateApplicationStatus(applicationId, "done");

		// 部署成功后扣减资源
		// if(application.previewResource != 0 ){
		// 	await db.transaction(async (tx) => {
		// 		// @ts-ignore
		// 		await tx.update(server).set({
		// 			resourceUsed: sql`${server.resourceUsed} + ${application.previewResource}`
		// 		}).where(eq(server.serverId, application.serverId))
		// 			.returning()
		// 		await tx.update(applications).set({
		// 			previewResource: 0
		// 		}).where(eq(applications.applicationId, application.applicationId)).returning()
		// 	})
		// }
	} catch (error) {
		// @ts-ignore
		const encodedContent = encodeBase64(error?.message);

		await execAsyncRemote(
			application.serverId,
			`
			echo "\n\n===================================EXTRA LOGS============================================" >> ${deployment.logPath};
			echo "Error occurred ❌, check the logs for details." >> ${deployment.logPath};
			echo "${encodedContent}" | base64 -d >> "${deployment.logPath}";`,
		);

		await updateDeploymentStatus(deployment.deploymentId, "error");
		await updateApplicationStatus(applicationId, "error");
		throw error;
	}

	return true;
};

export const getApplicationStats = async (
	containerId:string, containerName:string, serverId:string, appName:string, node:string) => {

	const data = await getContainerState(containerId, containerName, serverId, node, appName);

	return data;
};
