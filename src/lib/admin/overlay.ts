/** Keep pickers above their parent dialog and contain keyboard focus. */
export function mountAdminOverlay(node: HTMLElement, close: () => void) {
  const previousFocus = document.activeElement as HTMLElement | null;
  (node.closest('dialog') ?? document.body).appendChild(node);
  const focusable = () => Array.from(node.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
  )).filter((element) => element.getClientRects().length > 0);
  let alive = true;
  queueMicrotask(() => {
    if (alive) (node.querySelector<HTMLElement>('input:not([type="file"]), textarea') ?? focusable()[0])?.focus();
  });
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  };
  node.addEventListener('keydown', onKey);
  return { destroy() {
    alive = false;
    node.removeEventListener('keydown', onKey);
    node.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
  } };
}
