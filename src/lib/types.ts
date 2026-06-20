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
  highlights?: string[];
  difficulty_level?: string | null;
  group_size?: string;
  start_location?: string | null;
  end_location?: string | null;
  status?: string;
  is_featured?: boolean;
  is_popular?: boolean;
};

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
