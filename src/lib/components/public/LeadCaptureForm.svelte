<script lang="ts">
  import Button from './Button.svelte';
  import FormInput from './FormInput.svelte';
  import SelectInput from './SelectInput.svelte';
  import TextArea from './TextArea.svelte';

  export let title = 'Plan your Tanzania safari';
  export let compact = false;

  const travelInterests = ['Safari', 'Kilimanjaro', 'Safari + Zanzibar', 'Beach Holiday', 'Multi-country'].map((value) => ({
    label: value,
    value
  }));

  const budgetRanges = ['Comfort', 'Premium', 'Luxury', 'Not sure yet'].map((value) => ({
    label: value,
    value
  }));
</script>

<form class={`grid gap-4 rounded-lg border border-ink/10 bg-surface p-5 shadow-soft ${compact ? '' : 'md:p-6'}`}>
  <div>
    <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Emnel Lead Engine</p>
    <h3 class="mt-2 text-2xl font-bold tracking-normal text-heading">{title}</h3>
    <p class="mt-2 text-sm leading-6 text-ink/70">Tell us the basics and a local advisor can shape a confident safari, Kilimanjaro, or Zanzibar beach plan.</p>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <FormInput label="Full name" name="full_name" placeholder="Your name" required />
    <FormInput label="Email" name="email" type="email" placeholder="you@example.com" required />
    <SelectInput label="Travel interest" name="interest" options={travelInterests} />
    <SelectInput label="Budget range" name="budget_tier" options={budgetRanges} />
  </div>

  <TextArea label="Trip notes" name="message" placeholder="Dates, travelers, countries, must-see places..." />

  <div class="flex flex-wrap gap-3">
    <Button href="/plan-my-trip">Plan My Safari</Button>
    <Button href="/contact" variant="secondary">Talk to a Safari Advisor</Button>
  </div>
</form>
