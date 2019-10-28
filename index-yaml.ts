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

import {
    configureYaml,
    hasRepositoryGoals,
} from "@atomist/sdm-core";
import {
    SpringGoalCreator,
    SpringGoals,
} from "./lib/machine/goals";
import {
    MachineConfigurer,
    options,
} from "./lib/machine/options";
import { ImmaterialChange } from "./lib/machine/push";
import { IsReleaseCommit } from "./lib/machine/release";
import { SpringGoalConfigurer } from "./lib/machine/springSupport";

export const configuration = configureYaml<SpringGoals>(
    [
        "goals/no-goals.yaml",
        "goals/maven-goals.yaml",
        "goals/docker-goals.yaml",
    ],
    {
        tests: {
            hasRepositoryGoals,
            ImmaterialChange,
            IsReleaseCommit,
        },
        goals: SpringGoalCreator,
        configurers: [SpringGoalConfigurer, MachineConfigurer],
        options,
    });
