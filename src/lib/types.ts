export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export type Tour = {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  full_description?: string;
  destination_id?: string | null;
  category_id?: string | null;
  destinations?: { name?: string; slug?: string; country?: string } | null;
  tour_categories?: { name?: string; slug?: string } | null;
  experience_type?: string | null;
  persona_tags?: string[];
  duration_days?: number;
  duration_nights?: number;
  budget_tier?: string | null;
  price_from?: number;
  currency?: string;
  main_image_url?: string;
  banner_image_url?: string;
  sample_itinerary?: unknown;
  highlights?: string[];
  difficulty_level?: string | null;
  group_size?: string;
  group_size_min?: number | null;
  group_size_max?: number | null;
  minimum_age?: number | null;
  start_location?: string | null;
  end_location?: string | null;
  itinerary_days?: ItineraryDay[];
  tour_inclusions?: { title: string; sort_order?: number }[];
  tour_exclusions?: { title: string; sort_order?: number }[];
  status?: string;
  is_featured?: boolean;
  is_popular?: boolean;
};

export type ItineraryDay = {
  day_number: number;
  title: string;
  description?: string | null;
  accommodation?: string | null;
  meals?: string | null;
  activities?: string | null;
  image_url?: string | null;
};

export type GuideCalloutVariant = 'guide_tip' | 'local_insight' | 'safari_wisdom';

/**
 * A block in a destination's long-form guide (stored in the `guide` jsonb column).
 * The block types mirror the editorial "content system": prose, the three insight-box
 * styles, comparison tables, fact lists, photo slots and grouped FAQs. Rendered by
 * DestinationGuide.svelte. Kept loose so the editorial schema can grow without a migration.
 */
export type GuideBlock =
  | { type: 'part'; part?: number; title: string; subtitle?: string }
  | { type: 'richtext'; heading?: string; body: string }
  | { type: 'field_notes'; title?: string; body: string }
  | { type: 'callout'; variant: GuideCalloutVariant; body: string }
  | { type: 'did_you_know'; body: string }
  | { type: 'table'; title?: string; columns: string[]; rows: string[][] }
  | { type: 'photo'; caption: string; url?: string; alt?: string }
  | { type: 'facts'; title?: string; items: { label: string; value: string }[] }
  | { type: 'faq'; title?: string; items: { q: string; a: string }[] };

export type Destination = {
  id: string;
  name: string;
  slug: string;
  country?: string;
  region?: string;
  location?: string;
  short_description?: string;
  description?: string;
  image_url?: string;
  main_image_url?: string;
  banner_image_url?: string;
  latitude?: number;
  longitude?: number;
  safety_overview?: string;
  health_vaccinations?: string;
  security_advice?: string;
  travel_insurance_note?: string;
  emergency_contacts?: string;
  score_wildlife?: number | null;
  score_luxury?: number | null;
  score_family?: number | null;
  score_photography?: number | null;
  score_adventure?: number | null;
  score_budget_from?: number | null;
  status?: string;
  is_featured?: boolean;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  guide?: GuideBlock[];
  guide_reviewed_at?: string | null;
};

export type Country = {
  id: string;
  name: string;
  slug: string;
  hero_image_url?: string;
  intro_text?: string;
  best_months?: string[];
  visa_info?: string;
  health_info?: string;
  currency?: string;
  capital?: string;
  phase?: string;
  status?: string;
  is_featured?: boolean;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
};

export type Lodge = {
  id: string;
  name: string;
  slug: string;
  destination_id?: string | null;
  destinations?: { name: string; slug: string } | null;
  accommodation_level: 'budget' | 'mid_range' | 'luxury' | 'ultra_luxury';
  lodge_type: 'tented_camp' | 'lodge' | 'hotel' | 'mobile_camp' | 'treehouse';
  description?: string;
  why_we_recommend?: string;
  hero_image_url?: string;
  image_url?: string;
  price_per_night_from?: number | null;
  currency?: string;
  best_for?: string[];
  romantic_rating?: number | null;
  family_rating?: number | null;
  website_url?: string;
  status?: string;
  is_featured?: boolean;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type Activity = {
  id: string;
  name: string;
  slug: string;
  destination_id?: string | null;
  destinations?: { name: string; slug: string } | null;
  location_label?: string | null;
  category: 'wildlife' | 'adventure' | 'cultural' | 'water' | 'trekking' | 'relaxation';
  difficulty?: 'easy' | 'moderate' | 'challenging' | 'strenuous' | null;
  description?: string;
  why_we_recommend?: string;
  highlights?: string[];
  hero_image_url?: string;
  image_url?: string;
  duration_label?: string | null;
  price_from?: number | null;
  currency?: string;
  price_unit?: string | null;
  badge?: string | null;
  best_season?: string[];
  status?: string;
  is_featured?: boolean;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type TripPoint = {
  id: string;
  name: string;
  slug: string;
  destination_id?: string | null;
  destinations?: { name: string; slug: string } | null;
  role: 'start' | 'end' | 'both';
  gateway_type: 'airport' | 'city' | 'hotel' | 'border' | 'station';
  airport_code?: string | null;
  description?: string;
  transfer_info?: string;
  hero_image_url?: string;
  image_url?: string;
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type SafetyTopic = {
  id: string;
  title: string;
  slug: string;
  category: 'general' | 'health' | 'security' | 'wildlife' | 'practical';
  icon?: string | null;
  summary?: string;
  content?: string;
  image_url?: string;
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type TravelStyle = {
  id: string;
  name: string;
  slug: string;
  emotional_promise?: string;
  description?: string;
  desires?: string[];
  concerns?: string[];
  persona?: string | null;
  hero_image_url?: string;
  image_url?: string;
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type ComparisonDimension = { label: string; a: string; b: string };
export type ComparisonFaq = { q: string; a: string };

export type Comparison = {
  id: string;
  title: string;
  slug: string;
  eyebrow?: string;
  intro?: string;
  a_name: string;
  a_image_url?: string | null;
  b_name: string;
  b_image_url?: string | null;
  dimensions?: ComparisonDimension[];
  verdict?: string;
  cta_label?: string | null;
  cta_href?: string | null;
  faqs?: ComparisonFaq[];
  status?: string;
  is_featured?: boolean;
  sort_order?: number | null;
  seo_title?: string;
  meta_title?: string;
  meta_description?: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featured_image_url?: string;
  status?: string;
  author_name?: string;
};

export type Testimonial = {
  id: string;
  client_name: string;
  client_country?: string;
  client_image_url?: string;
  rating?: number;
  message: string;
  tour_id?: string | null;
  tours?: { id: string; slug: string; title: string } | null;
  status?: 'draft' | 'published' | 'archived';
  is_featured?: boolean;
  sort_order?: number;
};

// Named travel specialists (SRS v2.0 §5 trust / type 25) — the human face of the
// brand on tour pages and after enquiry. Loaded from the `specialists` API entity.
export type Specialist = {
  id?: string;
  name: string;
  role: string;
  photo_url?: string | null;
  blurb?: string | null;
  whatsapp_number?: string | null;
  status?: string;
  is_featured?: boolean;
  sort_order?: number;
  /** Legacy static field — kept so templates reading `photo` still type-check. */
  photo?: string;
};

export type FAQ = {
  id: string;
  question: string;
  answer: string;
};

export type AiChatResponse = {
  conversationId: string;
  reply: string;
  tourMatches: Array<Record<string, unknown>>;
};

// Emnel AI Safari Advisor — streamed chat (v2).
export type AdvisorRecommendation = {
  tour_id: string;
  title: string;
  slug: string;
  destination: string | null;
  duration_days: number | null;
  price_from: number | null;
  currency: string;
  availability_note: string;
  score: number; // internal — not shown to the visitor
  confidence_label: string; // user-facing qualitative label
  reasons: string[];
  limitations: string[];
  cta: string;
};

export type AdvisorAction = { type: string; label: string; url?: string };

export type AdvisorMeta = { conversation_id: string; language: string; route: string; degraded: boolean };

export type AdvisorDonePayload = {
  conversation_id: string;
  reply: string;
  language: string;
  lead_context?: Record<string, unknown>;
  recommendations: AdvisorRecommendation[];
  suggested_actions: AdvisorAction[];
  handoff_required: boolean;
  usage?: Record<string, unknown>;
};

export type AdvisorPageContext = {
  path?: string;
  tour_id?: string;
  tour_slug?: string;
  destination_id?: string;
  departure_id?: string;
};
