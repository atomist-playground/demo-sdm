/*
 * Copyright © 2019 Atomist, Inc.
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

import { Configuration } from "@atomist/automation-client";
import {
    githubGoalStatusSupport,
    GoalConfigurer,
    goalStateSupport,
    k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { buildAwareCodeTransforms } from "@atomist/sdm-pack-build";
import { gcpSupport } from "@atomist/sdm-pack-gcp";
import { issueSupport } from "@atomist/sdm-pack-issue";
import { k8sSupport } from "@atomist/sdm-pack-k8s";
import * as appRoot from "app-root-path";
import * as _ from "lodash";
import * as path from "path";
import { SpringGoals } from "./goals";

/**
 * SDM options for configure function.
 */
export const options: any = {
    name: "demo-sdm",
    preProcessors: [
        async (config: Configuration) => {
            _.merge(config, {
                sdm: {
                    spring: {
                        formatJar: path.join(appRoot.path, "bin", "spring-format-0.1.0-SNAPSHOT-jar-with-dependencies.jar"),
                    },
                    build: {
                        tag: false,
                    },
                    cache: {
                        bucket: "atm-demo-sdm-goal-cache-demo",
                        enabled: true,
                        path: "demo-sdm-cache",
                    },
                },
            });
            return config;
        },
    ],
    requiredConfigurationValues: [
        "sdm.docker.hub.registry",
        "sdm.docker.hub.user",
        "sdm.docker.hub.password",
    ],
};

export const MachineConfigurer: GoalConfigurer<SpringGoals> = async (sdm, goals) => {
    sdm.addExtensionPacks(
        gcpSupport(),
        buildAwareCodeTransforms({
            buildGoal: goals.build,
            issueCreation: {
                issueRouter: {
                    raiseIssue: async () => { /* raise no issues */
                    },
                },
            },
        }),
        issueSupport(),
        goalStateSupport(),
        githubGoalStatusSupport(),
        k8sGoalSchedulingSupport(),
        k8sSupport({ addCommands: true }),
    );
};
