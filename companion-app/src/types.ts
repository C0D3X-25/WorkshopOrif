export interface WorkspaceFile {
  name?: string;
  content?: string;
  gitUrl?: string;
}

export interface ExerciseRuntime {
  compose: string;
  devService: string;
  workspaceFiles?: WorkspaceFile[];
}

export interface LaunchRequestBody extends ExerciseRuntime {
  workshopId?: string;
}

export type DockerStatus = 'running' | 'stopped';
