export interface PortMapping {
  containerPort: number;
}

export interface WorkspaceFile {
  name?: string;
  content?: string;
  gitUrl?: string;
}

export interface DevContainerConfig {
  extensions?: string[];
  postCreateCommand?: string;
}

export interface WorkshopEnv {
  image: string;
  devContainer?: DevContainerConfig;
  workspaceFiles?: WorkspaceFile[];
  ports?: PortMapping[];
  env?: Record<string, string>;
}

export interface LaunchRequestBody extends WorkshopEnv {
  workshopId?: string;
}

export type DockerStatus = 'running' | 'stopped';
