// Proxmox VE task domain types

/** Proxmox task status values */
export type TaskStatus = "running" | "stopped" | "OK" | string;

/** Task summary as returned by /nodes/{node}/tasks */
export interface TaskSummary {
  upid: string; // Unique Process ID string
  node: string;
  pid: number;
  pstart: number;
  starttime: number; // Unix timestamp
  type: string; // e.g. "qmstart", "vzstart", "aptupdate"
  id?: string; // guest vmid or storage id
  user: string;
  status: TaskStatus;
  endtime?: number;
}

/** Full task log entry */
export interface TaskLogEntry {
  n: number; // line number
  t: string; // text
}

/** Task detail response */
export interface TaskDetail extends TaskSummary {
  log?: TaskLogEntry[];
  exitstatus?: string;
}

/** Helper to check if a task completed successfully */
export function isTaskSuccessful(task: TaskSummary): boolean {
  return task.status === "OK";
}

/** Helper to check if a task is still running */
export function isTaskRunning(task: TaskSummary): boolean {
  return task.status === "running";
}
