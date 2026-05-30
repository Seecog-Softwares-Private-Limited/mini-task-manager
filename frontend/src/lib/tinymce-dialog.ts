/** Returns true when the event target is part of TinyMCE UI (including portaled menus). */
export function isTinyMceUiTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(".tox-tinymce, .tox-tinymce-aux, .tox-dialog-wrap, .tox-dialog")
  );
}

/** True when focus is inside the TinyMCE editor container or its portaled UI. */
export function isTinyMceFocusActive(container?: HTMLElement | null): boolean {
  const active = document.activeElement;
  if (!active) return false;
  if (container?.contains(active)) return true;
  if (active.tagName === "IFRAME" && container?.querySelector("iframe") === active) {
    return true;
  }
  return isTinyMceUiTarget(active);
}
