/** Matches backend PatchTaskSubtaskDto / CreateTaskSubtaskDto @MaxLength(200). */
export const SUBTASK_TITLE_MAX_LENGTH = 200;

export function clampSubtaskTitle(title: string): string {
  return title.slice(0, SUBTASK_TITLE_MAX_LENGTH);
}
