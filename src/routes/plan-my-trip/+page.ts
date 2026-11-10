import type { PageLoad } from './$types';
import { loadPlanner } from '$lib/plannerEntry';
export const load: PageLoad = ({ fetch, url }) => loadPlanner(fetch, url);
