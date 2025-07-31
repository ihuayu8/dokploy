import { relations } from "drizzle-orm";
import {
	boolean, date,
	integer,
	json,
	pgEnum,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { z } from "zod";
import { bitbucket } from "./bitbucket";
import { deployments } from "./deployment";
import { domains } from "./domain";
import { gitea } from "./gitea";
import { github } from "./github";
import { gitlab } from "./gitlab";
import { mounts } from "./mount";
import { ports } from "./port";
import { previewDeployments } from "./preview-deployments";
import { projects } from "./project";
import { redirects } from "./redirects";
import { registry } from "./registry";
import { security } from "./security";
import { server } from "./server";
import { applicationStatus, certificateType, triggerType } from "./shared";
import { sshKeys } from "./ssh-key";
import { generateAppName } from "./utils";
import {
	buildType,
	HealthCheckSwarm, LabelsSwarm, NetworkSwarm,
	PlacementSwarm,
	RestartPolicySwarm, ServiceModeSwarm, sourceType,
	UpdateConfigSwarm
} from "@dokploy/server/db/schema/application";

export const applicationShopVersion = pgTable("application_shop_version", {
	versionId: text("versionId")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text("name").notNull(),
	description: text("description"),
	env: text("env"),
	previewEnv: text("previewEnv"),
	watchPaths: text("watchPaths").array(),
	previewBuildArgs: text("previewBuildArgs"),
	previewWildcard: text("previewWildcard"),
	previewPort: integer("previewPort").default(3000),
	previewHttps: boolean("previewHttps").notNull().default(false),
	previewPath: text("previewPath").default("/"),
	previewCertificateType: certificateType("certificateType")
		.notNull()
		.default("none"),
	previewCustomCertResolver: text("previewCustomCertResolver"),
	previewLimit: integer("previewLimit").default(3),
	isPreviewDeploymentsActive: boolean("isPreviewDeploymentsActive").default(
		false,
	),
	rollbackActive: boolean("rollbackActive").default(false),
	buildArgs: text("buildArgs"),
	title: text("title"),
	enabled: boolean("enabled"),
	subtitle: text("subtitle"),
	command: text("command"),
	refreshToken: text("refreshToken").$defaultFn(() => nanoid()),
	sourceType: sourceType("sourceType").notNull().default("github"),
	cleanCache: boolean("cleanCache").default(false),
	// Github
	repository: text("repository"),
	owner: text("owner"),
	branch: text("branch"),
	buildPath: text("buildPath").default("/"),
	triggerType: triggerType("triggerType").default("push"),
	autoDeploy: boolean("autoDeploy").$defaultFn(() => true),
	// Gitlab
	gitlabProjectId: integer("gitlabProjectId"),
	gitlabRepository: text("gitlabRepository"),
	gitlabOwner: text("gitlabOwner"),
	gitlabBranch: text("gitlabBranch"),
	gitlabBuildPath: text("gitlabBuildPath").default("/"),
	gitlabPathNamespace: text("gitlabPathNamespace"),
	// Gitea
	giteaRepository: text("giteaRepository"),
	giteaOwner: text("giteaOwner"),
	giteaBranch: text("giteaBranch"),
	giteaBuildPath: text("giteaBuildPath").default("/"),
	// Bitbucket
	bitbucketRepository: text("bitbucketRepository"),
	bitbucketOwner: text("bitbucketOwner"),
	bitbucketBranch: text("bitbucketBranch"),
	bitbucketBuildPath: text("bitbucketBuildPath").default("/"),
	// Docker
	username: text("username"),
	password: text("password"),
	dockerImage: text("dockerImage"),
	registryUrl: text("registryUrl"),
	// Git
	customGitUrl: text("customGitUrl"),
	customGitBranch: text("customGitBranch"),
	customGitBuildPath: text("customGitBuildPath"),
	customGitSSHKeyId: text("customGitSSHKeyId").references(
		() => sshKeys.sshKeyId,
		{
			onDelete: "set null",
		},
	),
	enableSubmodules: boolean("enableSubmodules").notNull().default(false),
	dockerfile: text("dockerfile"),
	dockerContextPath: text("dockerContextPath"),
	dockerBuildStage: text("dockerBuildStage"),
	// Drop
	dropBuildPath: text("dropBuildPath"),
	// Docker swarm json
	healthCheckSwarm: json("healthCheckSwarm").$type<HealthCheckSwarm>(),
	restartPolicySwarm: json("restartPolicySwarm").$type<RestartPolicySwarm>(),
	placementSwarm: json("placementSwarm").$type<PlacementSwarm>(),
	updateConfigSwarm: json("updateConfigSwarm").$type<UpdateConfigSwarm>(),
	rollbackConfigSwarm: json("rollbackConfigSwarm").$type<UpdateConfigSwarm>(),
	modeSwarm: json("modeSwarm").$type<ServiceModeSwarm>(),
	labelsSwarm: json("labelsSwarm").$type<LabelsSwarm>(),
	networkSwarm: json("networkSwarm").$type<NetworkSwarm[]>(),
	//
	replicas: integer("replicas").default(1).notNull(),
	buildType: buildType("buildType").notNull().default("nixpacks"),
	herokuVersion: text("herokuVersion").default("24"),
	publishDirectory: text("publishDirectory"),
	isStaticSpa: boolean("isStaticSpa"),
	registryId: text("registryId").references(() => registry.registryId, {
		onDelete: "set null",
	}),
	projectId: text("projectId")
		.notNull()
		.references(() => projects.projectId, { onDelete: "cascade" }),
	githubId: text("githubId").references(() => github.githubId, {
		onDelete: "set null",
	}),
	gitlabId: text("gitlabId").references(() => gitlab.gitlabId, {
		onDelete: "set null",
	}),
	giteaId: text("giteaId").references(() => gitea.giteaId, {
		onDelete: "set null",
	}),
	bitbucketId: text("bitbucketId").references(() => bitbucket.bitbucketId, {
		onDelete: "set null",
	}),
	stand: text("stand"),
	versionNum: text("versionNum"),
	appShopId: integer("appShopId"),
	status: text("status"),
	intime: date("intime").defaultNow(),

});

export const apiQueryTemp = z.object({
	appShopId: z.number(),
});