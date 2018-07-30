/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    anySatisfied,
    FromAtomist,
    IsDeployEnabled,
    not,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
    ToDefaultBranch,
    whenPushSatisfies,
} from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
    DisableDeploy,
    EnableDeploy,
    executeTag,
    HasDockerfile,
    NoGoals,
    summarizeGoalsInGitHubStatus,
    TagGoal,
    ToPublicRepo,
} from "@atomist/sdm-core";
import { kubernetesSupport } from "@atomist/sdm-pack-k8/dist";
import {
    IsAtomistAutomationClient,
    IsNode,
} from "@atomist/sdm-pack-node";
import {
    HasSpringBootApplicationClass,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import { gitHubTeamVote } from "@atomist/sdm/api-helper/voter/githubTeamVote";
import { AddDockerfile } from "../commands/addDockerfile";
import { IsSimplifiedDeployment } from "../support/isSimplifiedDeployment";
import {
    MaterialChangeToJvmRepo,
    MaterialChangeToNodeRepo,
} from "../support/materialChangeToRepo";
import {
    BuildGoals,
    BuildReleaseGoals,
    DockerGoals,
    DockerReleaseGoals,
    KubernetesDeployGoals,
    ProductionDeploymentGoal,
    SimplifiedKubernetesDeployGoals,
    StagingDeploymentGoal,
} from "./goals";
import { kubernetesDataCallback } from "./kubeSupport";
import { addNodeSupport } from "./nodeSupport";
import { addSpringSupport } from "./springSupport";

export function machine(
    configuration: SoftwareDeliveryMachineConfiguration,
): SoftwareDeliveryMachine {

    const sdm = createSoftwareDeliveryMachine({
            name: "Kubernetes Demo Software Delivery Machine",
            configuration,
        },

        // Spring
        whenPushSatisfies(IsMaven, not(MaterialChangeToJvmRepo))
            .itMeans("No material change to Java")
            .setGoals(NoGoals),
        whenPushSatisfies(IsMaven, HasSpringBootApplicationClass, ToDefaultBranch, HasDockerfile, ToPublicRepo,
            not(FromAtomist))
            .itMeans("Spring Boot service to deploy")
            .setGoals(KubernetesDeployGoals),
        whenPushSatisfies(IsMaven, HasSpringBootApplicationClass, HasDockerfile, ToPublicRepo, not(FromAtomist))
            .itMeans("Spring Boot service to Dockerize")
            .setGoals(DockerGoals),
        whenPushSatisfies(IsMaven, not(HasDockerfile))
            .itMeans("Build")
            .setGoals(BuildGoals),

        // Node
        whenPushSatisfies(IsNode, not(MaterialChangeToNodeRepo))
            .itMeans("No Material Change")
            .setGoals(NoGoals),
        // Simplified deployment for SDMs and automation clients
        whenPushSatisfies(IsNode, HasDockerfile, ToDefaultBranch, IsDeployEnabled, IsAtomistAutomationClient,
            IsSimplifiedDeployment("demo-sdm", "sentry-automation"))
            .itMeans("Simplified Deploy")
            .setGoals(SimplifiedKubernetesDeployGoals),
        whenPushSatisfies(IsNode, HasDockerfile, ToDefaultBranch, IsDeployEnabled, IsAtomistAutomationClient)
            .itMeans("Deploy")
            .setGoals(KubernetesDeployGoals),
        whenPushSatisfies(IsNode, HasDockerfile, ToDefaultBranch, IsAtomistAutomationClient)
            .itMeans("Docker Release Build")
            .setGoals(DockerReleaseGoals),
        whenPushSatisfies(IsNode, HasDockerfile, IsAtomistAutomationClient)
            .itMeans("Docker Build")
            .setGoals(DockerGoals),
        whenPushSatisfies(IsNode, not(HasDockerfile), ToDefaultBranch)
            .itMeans("Release Build")
            .setGoals(BuildReleaseGoals),
        whenPushSatisfies(IsNode, not(HasDockerfile))
            .itMeans("Build")
            .setGoals(BuildGoals),

    );

    sdm.addCommand(EnableDeploy)
        .addCommand(DisableDeploy)
        .addCodeTransformCommand(AddDockerfile);

    sdm.addGoalImplementation("tag", TagGoal,
        executeTag(sdm.configuration.sdm.projectLoader));

    addNodeSupport(sdm);
    addSpringSupport(sdm);

    sdm.addExtensionPacks(kubernetesSupport({
        deployments: [{
            goal: StagingDeploymentGoal,
            pushTest: anySatisfied(IsMaven, IsNode),
            callback: kubernetesDataCallback(sdm.configuration),
        }, {
            goal: ProductionDeploymentGoal,
            pushTest: anySatisfied(IsMaven, IsNode),
            callback: kubernetesDataCallback(sdm.configuration),
        }],
    }));

    sdm.addGoalApprovalRequestVote(gitHubTeamVote());

    summarizeGoalsInGitHubStatus(sdm);

    return sdm;
}
