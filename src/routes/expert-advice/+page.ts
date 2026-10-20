import type { PageLoad } from './$types';
import { generalFaqQuery, readAllFaqs } from '$lib/faqEntities';

/**
 * The page's FAQs, server-rendered. They were fetched in onMount, so the HTML a
 * crawler received had none of the questions or answers on the page whose job
 * is to answer them.
 *
 * This is GENERAL_FAQ_HOME: the one page that marks the general library up as
 * FAQPage, so it carries the whole library (every page of it) rather than a
 * sample: a general question cut here would be marked up nowhere.
 */
export const load: PageLoad = async ({ fetch }) => ({
  faqs: await readAllFaqs(fetch, generalFaqQuery())
});
