import { type ProjectProfile } from "./project-profile.js";
import type { TeamStore } from "./store.js";
export interface AdaptProjectInput {
    domain?: string;
    summary?: string;
    workers?: Record<string, {
        title: string;
        focus: string;
    }>;
}
export interface AdaptProjectResult {
    profile: ProjectProfile;
    mergedFrom: string[];
    written: string[];
}
export declare function adaptProject(store: TeamStore, agentId: string, input?: AdaptProjectInput): Promise<AdaptProjectResult>;
