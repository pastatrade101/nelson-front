<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import WhatsAppCta from '$lib/components/public/WhatsAppCta.svelte';
  import { SITE_URL } from '$lib/config/env';
  import { looksLikeHtml, plainTextToHtml, sanitizeRichText, toMetaText } from '$lib/richtext';
  import type { SafariEssential } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: article = data.article as SafariEssential;

  $: seoTitle = article.meta_title?.trim() || `${article.title} | Emnel Adventures`;
  $: seoDescription =
    article.meta_description?.trim() || article.summary?.trim() || toMetaText(article.content, 300);
  // Used for JSON-LD only. The rel=canonical tag is emitted once by the root
  // layout for every page; a second one here would give Google two competing
  // canonicals, which it resolves by ignoring both.
  $: canonical = SITE_URL ? `${SITE_URL}/safari-essentials/${article.slug}` : '';

  // The body is authored in the CMS, so it is sanitised before it is trusted —
  // same pipeline the blog and About pages use. Plain-text drafts are wrapped
  // into paragraphs so an unformatted article still reads correctly.
  $: bodyHtml = article.content
    ? sanitizeRichText(looksLikeHtml(article.content) ? article.content : plainTextToHtml(article.content))
    : '';

  $: articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    ...(seoDescription ? { description: seoDescription } : {}),
    ...(article.hero_image_url ? { image: article.hero_image_url } : {}),
    ...(article.updated_at ? { dateModified: article.updated_at } : {}),
    ...(article.created_at ? { datePublished: article.created_at } : {}),
    ...(canonical ? { mainEntityOfPage: canonical } : {}),
    publisher: { '@type': 'Organization', name: 'Emnel Adventures' }
  };
</script>

<svelte:head>
  <title>{seoTitle}</title>
  {#if seoDescription}<meta name="description" content={seoDescription} />{/if}
  {#if article.noindex}<meta name="robots" content="noindex,nofollow" />{/if}
  {#if article.og_image_url || article.hero_image_url}
    <meta property="og:image" content={article.og_image_url || article.hero_image_url} />
  {/if}
</svelte:head>

<JsonLd data={articleSchema} />

<article>
  {#if article.hero_image_url}
    <div class="relative h-[38vh] min-h-[260px] overflow-hidden bg-deep-green md:h-[46vh]">
      <ResponsiveImage
        src={article.hero_image_url}
        alt={article.title}
        eager
        priority
        sizes="100vw"
        imgClass="h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent"></div>
    </div>
  {/if}

  <div class="container-shell py-12">
    <a
      href="/safari-essentials"
      class="inline-flex items-center gap-2 text-sm text-ink/60 transition hover:text-deep-green"
    >
      <ArrowLeft class="h-4 w-4" />
      Safari Essentials
    </a>

    <header class="mt-6 max-w-3xl">
      {#if article.topic}
        <p class="text-xs uppercase tracking-[0.2em] text-goldfinch-gold">{article.topic}</p>
      {/if}
      <h1 class="mt-3 font-serif text-4xl font-light leading-tight text-heading md:text-5xl">
        {article.title}
      </h1>
      {#if article.summary}
        <p class="mt-5 text-lg leading-relaxed text-ink/75">{article.summary}</p>
      {/if}
    </header>

    {#if bodyHtml}
      <div class="essential-prose mt-10 max-w-3xl">
        {@html bodyHtml}
      </div>
    {/if}

    <div class="mt-14 max-w-3xl border-t border-ink/10 pt-10">
      <h2 class="font-serif text-2xl font-light text-heading">Still deciding?</h2>
      <p class="mt-3 text-ink/75">
        Tell us roughly when you want to travel and we will tell you honestly whether it works.
      </p>
      <div class="mt-6">
        <WhatsAppCta
          label="Ask us about this"
          context="safari-essentials"
          message={`Hi Emnel — I was reading "${article.title}" and have a question.`}
          meta={{ metadata: { article: article.slug } }}
        />
      </div>
    </div>
  </div>
</article>

<style>
  /* Article body typography. Longer measure and larger type than the legal
     pages: these are read end-to-end, not scanned for a clause. */
  .essential-prose :global(h2) {
    margin-top: 2.5rem;
    font-family: var(--font-serif, 'Cormorant Garamond', serif);
    font-size: 1.75rem;
    font-weight: 300;
    color: rgb(var(--c-heading));
    letter-spacing: -0.01em;
  }
  .essential-prose :global(h2:first-child) {
    margin-top: 0;
  }
  .essential-prose :global(h3) {
    margin-top: 1.75rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: rgb(var(--c-ink));
  }
  .essential-prose :global(p) {
    margin-top: 1rem;
    font-size: 1.02rem;
    line-height: 1.8;
    color: rgb(var(--c-ink) / 0.78);
  }
  .essential-prose :global(ul),
  .essential-prose :global(ol) {
    margin-top: 1rem;
    display: grid;
    gap: 0.6rem;
    padding-left: 1.2rem;
    list-style: disc;
  }
  .essential-prose :global(ol) {
    list-style: decimal;
  }
  .essential-prose :global(li) {
    font-size: 1.02rem;
    line-height: 1.75;
    color: rgb(var(--c-ink) / 0.78);
  }
  .essential-prose :global(strong) {
    font-weight: 700;
    color: rgb(var(--c-ink));
  }
  .essential-prose :global(a) {
    font-weight: 600;
    color: rgb(var(--c-forest));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .essential-prose :global(blockquote) {
    margin: 1.75rem 0;
    border-left: 2px solid rgb(var(--c-goldfinch-gold));
    padding-left: 1.25rem;
    font-family: var(--font-serif, 'Cormorant Garamond', serif);
    font-size: 1.3rem;
    font-weight: 300;
    line-height: 1.6;
    color: rgb(var(--c-heading));
  }
  .essential-prose :global(hr) {
    margin: 2rem 0;
    border: 0;
    border-top: 1px solid rgb(var(--c-ink) / 0.1);
  }
</style>
