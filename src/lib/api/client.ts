import { browser } from '$app/environment';
import { API_URL } from '$lib/config/env';
import type { AiChatResponse, ApiResponse, BlogPost, Destination, FAQ, Paginated, Testimonial, Tour } from '$lib/types';

type QueryValue = string | number | boolean | undefined | null;
type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown>;
};

const authToken = () => {
  if (!browser) return null;
  return localStorage.getItem('admin_token');
};

const queryString = (params: Record<string, QueryValue> = {}) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }

  const value = search.toString();
  return value ? `?${value}` : '';
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
  const token = authToken();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const requestBody: BodyInit | undefined = isFormData
    ? (options.body as BodyInit)
    : options.body
      ? JSON.stringify(options.body)
      : undefined;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: requestBody
  });

  const result = (await response.json().catch(() => ({
    success: false,
    message: 'Unexpected API response.',
    data: null
  }))) as ApiResponse<T>;

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'API request failed.');
  }

  return result;
};

export const api = {
  health: () => apiRequest('/health'),
  auth: {
    login: (body: { email: string; password: string }) =>
      apiRequest<{ token: string; user: { name: string; email: string; role: string }; expiresIn: string }>('/auth/login', {
        method: 'POST',
        body
      }),
    logout: () => apiRequest('/auth/logout', { method: 'POST' }),
    me: () => apiRequest('/auth/me')
  },
  users: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/users${queryString(params)}`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/users/${id}`),
    create: (body: Record<string, unknown>) => apiRequest('/users', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/users/${id}`, { method: 'PUT', body }),
    updateStatus: (id: string, body: Record<string, unknown>) => apiRequest(`/users/${id}/status`, { method: 'PUT', body }),
    updatePassword: (id: string, body: Record<string, unknown>) => apiRequest(`/users/${id}/password`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' })
  },
  roles: {
    list: () => apiRequest<Array<{ role: string; permissions: string[] }>>('/roles'),
    permissions: () => apiRequest<string[]>('/roles/permissions'),
    updatePermissions: (role: string, permissions: string[]) =>
      apiRequest(`/roles/${role}/permissions`, { method: 'PUT', body: { permissions } })
  },
  tours: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Tour>>(`/tours${queryString(params)}`),
    get: (slug: string) => apiRequest<Tour>(`/tours/${slug}`),
    create: (body: Record<string, unknown>) => apiRequest<Tour>('/tours', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest<Tour>(`/tours/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/tours/${id}`, { method: 'DELETE' })
  },
  departures: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Record<string, unknown>[]>(`/departures${queryString(params)}`)
  },
  itineraries: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<Paginated<Record<string, unknown>>>(`/itineraries${queryString(params)}`),
    byTour: (tourId: string) => apiRequest<Record<string, unknown>[]>(`/tours/${tourId}/itineraries`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/itineraries/${id}`),
    create: (body: Record<string, unknown>) => apiRequest<Record<string, unknown>>('/itineraries', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>(`/itineraries/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/itineraries/${id}`, { method: 'DELETE' })
  },
  availableDates: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<Paginated<Record<string, unknown>>>(`/available-dates${queryString(params)}`),
    byTour: (tourId: string) => apiRequest<Record<string, unknown>[]>(`/tours/${tourId}/available-dates`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/available-dates/${id}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/available-dates', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>(`/available-dates/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/available-dates/${id}`, { method: 'DELETE' })
  },
  pricingOptions: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<Paginated<Record<string, unknown>>>(`/pricing-options${queryString(params)}`),
    byTour: (tourId: string) => apiRequest<Record<string, unknown>[]>(`/tours/${tourId}/pricing-options`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/pricing-options/${id}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/pricing-options', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>(`/pricing-options/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/pricing-options/${id}`, { method: 'DELETE' })
  },
  tourInclusions: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<Paginated<Record<string, unknown>>>(`/tour-inclusions${queryString(params)}`),
    byTour: (tourId: string) => apiRequest<Record<string, unknown>[]>(`/tours/${tourId}/inclusions`),
    create: (body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/tour-inclusions', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>(`/tour-inclusions/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/tour-inclusions/${id}`, { method: 'DELETE' })
  },
  tourExclusions: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<Paginated<Record<string, unknown>>>(`/tour-exclusions${queryString(params)}`),
    byTour: (tourId: string) => apiRequest<Record<string, unknown>[]>(`/tours/${tourId}/exclusions`),
    create: (body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/tour-exclusions', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>(`/tour-exclusions/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/tour-exclusions/${id}`, { method: 'DELETE' })
  },
  tourImages: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<Paginated<Record<string, unknown>>>(`/tour-images${queryString(params)}`),
    byTour: (tourId: string) => apiRequest<Record<string, unknown>[]>(`/tours/${tourId}/images`),
    create: (body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/tour-images', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>(`/tour-images/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/tour-images/${id}`, { method: 'DELETE' })
  },
  destinations: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Destination>>(`/destinations${queryString(params)}`),
    get: (slug: string) => apiRequest<Destination>(`/destinations/${slug}`),
    create: (body: Record<string, unknown>) => apiRequest<Destination>('/destinations', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest<Destination>(`/destinations/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/destinations/${id}`, { method: 'DELETE' })
  },
  categories: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/categories${queryString(params)}`),
    get: (slug: string) => apiRequest<Record<string, unknown>>(`/categories/${slug}`),
    create: (body: Record<string, unknown>) => apiRequest('/categories', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/categories/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/categories/${id}`, { method: 'DELETE' })
  },
  bookings: {
    create: (body: Record<string, unknown>) => apiRequest<Record<string, unknown>>('/bookings', { method: 'POST', body }),
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/bookings${queryString(params)}`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/bookings/${id}`),
    getByCode: (code: string) => apiRequest<Record<string, unknown>>(`/bookings/code/${code}`),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/bookings/${id}`, { method: 'PUT', body }),
    updateStatus: (id: string, body: Record<string, unknown>) =>
      apiRequest(`/bookings/${id}/status`, { method: 'PUT', body }),
    assign: (id: string, body: Record<string, unknown>) => apiRequest(`/bookings/${id}/assign`, { method: 'PUT', body }),
    updateNotes: (id: string, body: Record<string, unknown>) => apiRequest(`/bookings/${id}/notes`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/bookings/${id}`, { method: 'DELETE' })
  },
  payments: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/payments${queryString(params)}`),
    create: (body: Record<string, unknown>) => apiRequest('/payments', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/payments/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/payments/${id}`, { method: 'DELETE' })
  },
  blog: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<BlogPost>>(`/blog${queryString(params)}`),
    get: (slug: string) => apiRequest<BlogPost>(`/blog/${slug}`),
    create: (body: Record<string, unknown>) => apiRequest<BlogPost>('/blog', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest<BlogPost>(`/blog/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/blog/${id}`, { method: 'DELETE' })
  },
  blogCategories: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/blog-categories${queryString(params)}`),
    get: (slug: string) => apiRequest<Record<string, unknown>>(`/blog-categories/${slug}`),
    create: (body: Record<string, unknown>) => apiRequest('/blog-categories', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/blog-categories/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/blog-categories/${id}`, { method: 'DELETE' })
  },
  gallery: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/gallery${queryString(params)}`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/gallery/${id}`),
    create: (body: Record<string, unknown>) => apiRequest('/gallery', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/gallery/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/gallery/${id}`, { method: 'DELETE' })
  },
  media: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/media${queryString(params)}`),
    create: (body: Record<string, unknown>) => apiRequest('/media', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/media/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/media/${id}`, { method: 'DELETE' })
  },
  testimonials: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Testimonial>>(`/testimonials${queryString(params)}`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/testimonials/${id}`),
    create: (body: Record<string, unknown>) => apiRequest('/testimonials', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/testimonials/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/testimonials/${id}`, { method: 'DELETE' })
  },
  faqs: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<FAQ>>(`/faqs${queryString(params)}`),
    get: (id: string) => apiRequest<Record<string, unknown>>(`/faqs/${id}`),
    create: (body: Record<string, unknown>) => apiRequest('/faqs', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => apiRequest(`/faqs/${id}`, { method: 'PUT', body }),
    remove: (id: string) => apiRequest(`/faqs/${id}`, { method: 'DELETE' })
  },
  homepage: {
    get: (params?: Record<string, QueryValue>) => apiRequest<Record<string, unknown>[]>(`/homepage${queryString(params)}`),
    update: (sections: Record<string, unknown>[]) => apiRequest('/homepage', { method: 'PUT', body: { sections } }),
    createSection: (body: Record<string, unknown>) => apiRequest('/homepage/sections', { method: 'POST', body }),
    updateSection: (id: string, body: Record<string, unknown>) => apiRequest(`/homepage/sections/${id}`, { method: 'PUT', body }),
    removeSection: (id: string) => apiRequest(`/homepage/sections/${id}`, { method: 'DELETE' })
  },
  contact: {
    create: (body: Record<string, unknown>) => apiRequest('/contact', { method: 'POST', body }),
    messages: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/contact/messages${queryString(params)}`),
    message: (id: string) => apiRequest<Record<string, unknown>>(`/contact/messages/${id}`),
    updateMessageStatus: (id: string, body: Record<string, unknown>) => apiRequest(`/contact/messages/${id}/status`, { method: 'PUT', body }),
    assignMessage: (id: string, body: Record<string, unknown>) => apiRequest(`/contact/messages/${id}/assign`, { method: 'PUT', body }),
    updateNotes: (id: string, body: Record<string, unknown>) => apiRequest(`/contact/messages/${id}/notes`, { method: 'PUT', body }),
    removeMessage: (id: string) => apiRequest(`/contact/messages/${id}`, { method: 'DELETE' })
  },
  upload: {
    image: (file: File, folder = 'uploads', metadata: { alt_text?: string; caption?: string } = {}) => {
      const formData = new FormData();
      formData.set('image', file);
      formData.set('folder', folder);
      if (metadata.alt_text !== undefined) formData.set('alt_text', metadata.alt_text);
      if (metadata.caption !== undefined) formData.set('caption', metadata.caption);
      return apiRequest<{ url: string; path: string }>('/upload/image', { method: 'POST', body: formData });
    },
    lottie: (file: File, folder = 'lottie') => {
      const formData = new FormData();
      formData.set('lottie', file);
      formData.set('folder', folder);
      return apiRequest<{ url: string; path: string }>('/upload/lottie', { method: 'POST', body: formData });
    }
  },
  dashboard: {
    stats: () => apiRequest<Record<string, unknown>>('/dashboard/stats')
  },
  settings: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Record<string, unknown>[]>(`/settings${queryString(params)}`),
    get: (key: string) => apiRequest<Record<string, unknown>>(`/settings/${key}`),
    byGroup: (group: string) => apiRequest<Record<string, unknown>[]>(`/settings/group/${group}`),
    create: (body: Record<string, unknown>) => apiRequest('/settings', { method: 'POST', body }),
    update: (key: string, body: Record<string, unknown>) => apiRequest(`/settings/${key}`, { method: 'PUT', body }),
    remove: (key: string) => apiRequest(`/settings/${key}`, { method: 'DELETE' }),
    public: () => apiRequest<Record<string, unknown>>('/public/settings')
  },
  branding: {
    get: () => apiRequest<Record<string, unknown>>('/branding'),
    update: (body: Record<string, unknown>) => apiRequest<Record<string, unknown>>('/branding', { method: 'PUT', body })
  },
  auditLogs: {
    list: (params?: Record<string, QueryValue>) => apiRequest<Paginated<Record<string, unknown>>>(`/audit-logs${queryString(params)}`)
  },
  aiTravelAdvisor: {
    chat: (body: { conversationId?: string; message: string; lead?: Record<string, unknown> }) =>
      apiRequest<AiChatResponse>('/ai/chat', { method: 'POST', body }),
    conversations: (params?: Record<string, QueryValue>) =>
      apiRequest<Paginated<Record<string, unknown>>>(`/ai/conversations${queryString(params)}`),
    conversation: (id: string) => apiRequest<Record<string, unknown>>(`/ai/conversations/${id}`),
    handoff: (id: string, body: Record<string, unknown> = {}) =>
      apiRequest(`/ai/conversations/${id}/handoff`, { method: 'POST', body }),
    tourMatches: (conversationId: string) =>
      apiRequest<Array<Record<string, unknown>>>(`/ai/tour-matches/${conversationId}`)
  },
  hubspot: {
    syncLead: (body: Record<string, unknown>) => apiRequest('/hubspot/sync-lead', { method: 'POST', body }),
    syncBooking: (body: Record<string, unknown>) => apiRequest('/hubspot/sync-booking', { method: 'POST', body })
  }
};
