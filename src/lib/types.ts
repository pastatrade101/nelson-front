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
  duration_days?: number;
  duration_nights?: number;
  price_from?: number;
  currency?: string;
  main_image_url?: string;
  banner_image_url?: string;
  group_size?: string;
  status?: string;
  is_featured?: boolean;
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
