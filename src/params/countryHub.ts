import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Matches a country hub slug: `tanzania-safaris`, `kenya-safaris`,
 * `south-africa-safaris`.
 *
 * A matcher rather than a literal route per country, so adding Kenya is a
 * content decision rather than a deploy. It is deliberately narrow — only
 * lowercase words ending in `-safaris` — so this root-level dynamic route can
 * never shadow `/about`, `/tours` or anything else. SvelteKit prefers static
 * segments anyway; this makes it impossible rather than merely unlikely.
 */
export const match: ParamMatcher = (param) => /^[a-z]+(?:-[a-z]+)*-safaris$/.test(param);
