/**
 * A tour title as a card shows it: the name, and the route when the title
 * carries one after a colon. The day count is left off the name because the
 * card says it beside the comfort level.
 *
 *   "7-Day Tanzania Luxury Lodge Safari: Tarangire, Serengeti & Ngorongoro"
 *     → { name: "Tanzania Luxury Lodge Safari", route: "Tarangire, Serengeti & Ngorongoro" }
 *   "7 Day Serengeti Safari & Zanzibar" → { name: "Serengeti Safari & Zanzibar", route: "" }
 */
export const splitTourTitle = (title = ''): { name: string; route: string } => {
  const [head, ...rest] = title.split(':');
  const name = head.replace(/^\s*\d+[\s-]*days?\b[\s:–—-]*/i, '').trim() || head.trim();
  return { name, route: rest.join(':').trim() };
};
