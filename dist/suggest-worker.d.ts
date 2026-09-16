import type { ProjectProfile } from "./project-profile.js";
export interface SuggestWorkerInput {
    claim?: string[];
    hint?: string;
    workerIds: string[];
    profile: ProjectProfile | null;
}
export interface WorkerSuggestion {
    id: string;
    score: number;
    title: string;
    focus: string;
    reasons: string[];
}
export declare function suggestWorkers(input: SuggestWorkerInput): WorkerSuggestion[];
export declare function topWorkerSuggestion(suggestions: WorkerSuggestion[]): WorkerSuggestion | null;
