<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { staggeredCardReveal } from '$lib/animations';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import { toMetaText } from '$lib/richtext';
  import type { SafariEssential } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: articles = (data.articles ?? []) as SafariEssential[];
  $: loadFailed = data.loadFailed;

  // Grouped by editorial topic so the hub reads as a planning sequence rather
  // than an undifferentiated list. Order within each group is the API's
  // sort_order; the group order follows first appearance, so the running order
  // is entirely editorial — no code change to re-sequence the hub.
  type Group = { topic: string; items: SafariEssential[] };
  $: groups = articles.reduce<Group[]>((acc, article) => {
    const topic = article.topic?.trim() || 'Guides';
    const existing = acc.find((g) => g.topic === topic);
    if (existing) existing.items.push(article);
    else acc.push({ topic, items: [article] });
    return acc;
  }, []);

  const cardSummary = (article: SafariEssential) =>
    article.summary?.trim() || toMetaText(article.content, 160);

  const title = 'Tanzania Safari Essentials | Emnel Adventures';
  const description =
    'Straight answers to the questions that decide a safari: when to go, what it costs, how the migration times out, and what to pack.';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
</svelte:head>

<section class="container-shell py-14">
  <SectionHeader
    eyebrow="Safari Essentials"
    title="Everything worth knowing before you go"
    description={description}
  />

  {#if loadFailed}
    <ErrorState message="We could not load the guides right now. Please refresh in a moment." />
  {:else if articles.length}
    <div class="mt-12 space-y-14">
      {#each groups as group (group.topic)}
        <div>
          <h2 class="font-serif text-2xl font-light text-heading">{group.topic}</h2>
          <div class="mt-6 grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
            {#each group.items as article (article.id)}
              <a
                href={`/safari-essentials/${article.slug}`}
                class="group flex flex-col bg-linen shadow-soft transition hover:shadow-lg"
              >
                {#if article.hero_image_url}
                  <div class="aspect-[3/2] overflow-hidden">
                    <ResponsiveImage
                      src={article.hero_image_url}
                      alt={article.title}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      imgClass="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                {/if}
                <div class="flex flex-1 flex-col p-6">
                  <h3 class="font-serif text-xl font-light text-heading">{article.title}</h3>
                  {#if cardSummary(article)}
                    <p class="mt-3 flex-1 text-sm leading-relaxed text-ink/75">{cardSummary(article)}</p>
                  {/if}
                  <span class="mt-5 inline-flex items-center gap-2 text-sm font-medium text-deep-green">
                    Read the guide
                    <ArrowRight class="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Every topic is still a draft. Better an honest empty hub than nine
         placeholder pages competing with the itineraries for the same terms. -->
    <EmptyState
      title="Our guides are being written"
      message="We are writing these properly rather than publishing filler. In the meantime, tell us what you are planning and we will answer it directly."
    />
  {/if}
</section>
