<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { imgUrl, thumbUrl } from '$lib/img';
  import type { BlogPost } from '$lib/types';

  type JournalCard = {
    category: string;
    title: string;
    excerpt: string;
    image: string;
    href: string;
  };

  export let eyebrow = 'The Emnel Journal';
  export let title = 'Field Notes From';
  export let accentTitle = 'Tanzania';
  export let ctaLabel = 'View All Articles';
  export let ctaHref = '/blog';
  export let posts: BlogPost[] = [];

  const fallbackCards: JournalCard[] = [
    {
      category: 'Migration - Serengeti',
      title: 'When Is the Best Time to See the Great Migration?',
      excerpt: "Every month is different, and there is no single wrong time. The answer depends on how the Serengeti's rainfall patterns move the herds.",
      image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801',
      href: '/blog'
    },
    {
      category: 'Calving Season - Ndutu',
      title: "Why Calving Season Is the Migration's Best-Kept Secret",
      excerpt: 'Predator action, green plains, and hundreds of thousands of calves make January to March extraordinary.',
      image: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d',
      href: '/blog'
    },
    {
      category: 'Fly-In Safaris - Tanzania',
      title: 'More Wildlife. Less Driving. The Case for a Fly-In Safari',
      excerpt: 'A fly-in route gives you more effective safari days and less time lost to long transfers.',
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05',
      href: '/blog'
    }
  ];

  const toCard = (post: BlogPost): JournalCard => ({
    category: post.author_name ?? 'Emnel Journal',
    title: post.title,
    excerpt: post.excerpt ?? 'Practical field notes from Tanzania safari planning.',
    image: thumbUrl(post as unknown as Record<string, unknown>, 'featured_image_url') || post.featured_image_url || fallbackCards[0].image,
    href: `/blog/${post.slug}`
  });

  $: cards = [...posts.map(toCard), ...fallbackCards].slice(0, 3);
</script>

<section class="bg-deep-green py-16 text-white md:py-24" use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell">
    <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="brand-eyebrow">{eyebrow}</p>
        <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-white sm:text-[54px] lg:text-[64px]">
          {title}
          <span class="block italic text-goldfinch-gold">{accentTitle}</span>
        </h2>
      </div>
      <a class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold transition hover:text-white" href={ctaHref}>
        {ctaLabel}
        <ArrowRight size={15} strokeWidth={2.5} />
      </a>
    </div>

    <div class="mt-14 grid border border-white/[0.07] bg-white/[0.07] md:grid-cols-3" use:staggeredCardReveal={{ selector: '.journal-card', y: 16, stagger: 0.06 }}>
      {#each cards as card}
        <article class="journal-card border-b border-white/[0.07] bg-[#25221b] md:border-b-0 md:border-r">
          <a href={card.href} class="group block h-full">
            <div class="aspect-[16/9] overflow-hidden bg-midnight">
              <img class="h-full w-full object-cover transition duration-[800ms] group-hover:scale-105" src={imgUrl(card.image, 900, 76)} alt={card.title} loading="lazy" />
            </div>
            <div class="p-7 md:p-8">
              <p class="text-[12px] font-bold uppercase tracking-[0.26em] text-white/42">{card.category}</p>
              <h3 class="mt-7 font-serif text-[26px] font-normal leading-tight text-white">{card.title}</h3>
              <p class="mt-5 line-clamp-4 text-[15px] font-medium leading-8 text-white/58">{card.excerpt}</p>
              <span class="mt-8 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
                Read Article <ArrowRight size={14} strokeWidth={2.5} />
              </span>
            </div>
          </a>
        </article>
      {/each}
    </div>
  </div>
</section>
