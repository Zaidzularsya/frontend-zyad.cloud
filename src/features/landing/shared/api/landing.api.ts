import { http } from '@/lib/http'
import type {
  BaseResponse,
  CallToAction,
  LandingAvailableDomain,
  LandingBranding,
  LandingDeliveryLog,
  LandingDomainBinding,
  LandingForm,
  LandingFormField,
  LandingIntegration,
  LandingMedia,
  LandingMenu,
  LandingMenuItem,
  LandingPage,
  LandingRevision,
  LandingSection,
  PaginatedResponse,
  SectionTemplate,
} from '@/features/landing/shared/types/landing.types'

interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: unknown
}

interface ListEnvelope<T> {
  items?: T[]
  meta?: PaginatedResponse<T>['meta']
}

type QueryParams = Record<string, string | number | boolean | undefined | null>
type RawRecord = Record<string, unknown>

function pick<T>(raw: RawRecord, snake: string, pascal: string, fallback: T): T {
  return (raw[snake] ?? raw[pascal] ?? fallback) as T
}

function normalizePage(raw: RawRecord): LandingPage {
  return {
    id: pick(raw, 'id', 'ID', ''),
    name: pick(raw, 'name', 'Name', ''),
    title: pick(raw, 'title', 'Title', ''),
    slug: pick(raw, 'slug', 'Slug', ''),
    page_type: pick(raw, 'page_type', 'Type', 'homepage'),
    status: pick(raw, 'status', 'Status', 'draft'),
    visibility: pick(raw, 'visibility', 'Visibility', 'public'),
    locale: pick(raw, 'locale', 'Locale', 'id-ID'),
    timezone: pick(raw, 'timezone', 'Timezone', 'Asia/Jakarta'),
    is_homepage: pick(raw, 'is_homepage', 'IsHomepage', false),
    is_template: pick(raw, 'is_template', 'IsTemplate', false),
    settings: pick(raw, 'settings', 'Settings', {}),
    seo: pick(raw, 'seo', 'SEO', {}),
    published_version: pick(raw, 'published_version', 'PublishedVersion', 0),
    publish_at: pick(raw, 'publish_at', 'PublishAt', null),
    unpublish_at: pick(raw, 'unpublish_at', 'UnpublishAt', null),
    published_at: pick(raw, 'published_at', 'PublishedAt', null),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
    deleted_at: pick(raw, 'deleted_at', 'DeletedAt', null),
    template: pick(raw, 'template', 'Template', undefined),
    theme: pick(raw, 'theme', 'Theme', undefined),
    preferences: pick(raw, 'preferences', 'Preferences', undefined),
  }
}

function normalizeCTA(raw: RawRecord): CallToAction {
  return {
    id: pick(raw, 'id', 'ID', ''),
    name: pick(raw, 'name', 'Name', ''),
    label: pick(raw, 'label', 'Label', ''),
    type: pick(raw, 'type', 'Type', 'external_link'),
    target: pick(raw, 'target', 'Target', 'self'),
    destination: pick(raw, 'destination', 'Destination', ''),
    tracking_key: pick(raw, 'tracking_key', 'TrackingKey', ''),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeSection(raw: RawRecord): LandingSection {
  return {
    id: pick(raw, 'id', 'ID', ''),
    key: pick(raw, 'key', 'Key', ''),
    type: pick(raw, 'type', 'Type', ''),
    name: pick(raw, 'name', 'Name', ''),
    sort_order: pick(raw, 'sort_order', 'SortOrder', 0),
    is_enabled: pick(raw, 'is_enabled', 'IsEnabled', true),
    content: pick(raw, 'content', 'Content', {}),
    style: pick(raw, 'style', 'Style', {}),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
    variant: pick(raw, 'variant', 'Variant', undefined),
  }
}

function normalizeForm(raw: RawRecord): LandingForm {
  return {
    id: pick(raw, 'id', 'ID', ''),
    name: pick(raw, 'name', 'Name', ''),
    key: pick(raw, 'key', 'Key', ''),
    submit_label: pick(raw, 'submit_label', 'SubmitLabel', ''),
    success_message: pick(raw, 'success_message', 'SuccessMessage', ''),
    redirect_url: pick(raw, 'redirect_url', 'RedirectURL', null),
    is_active: pick(raw, 'is_active', 'IsActive', false),
    consent: pick(raw, 'consent', 'Consent', {}),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeFormField(raw: RawRecord): LandingFormField {
  return {
    id: pick(raw, 'id', 'ID', undefined),
    key: pick(raw, 'key', 'Key', ''),
    type: pick(raw, 'type', 'Type', 'text'),
    label: pick(raw, 'label', 'Label', ''),
    placeholder: pick(raw, 'placeholder', 'Placeholder', ''),
    options: pick(raw, 'options', 'Options', []),
    validation: pick(raw, 'validation', 'Validation', {}),
    required: pick(raw, 'required', 'Required', pick(raw, 'is_required', 'IsRequired', false)),
    sort_order: pick(raw, 'sort_order', 'SortOrder', 0),
  }
}

function normalizeBranding(raw: RawRecord): LandingBranding {
  return {
    company_name: pick(raw, 'company_name', 'CompanyName', ''),
    tagline: pick(raw, 'tagline', 'Tagline', ''),
    logo_light_url: pick(raw, 'logo_light_url', 'LogoLightURL', ''),
    logo_dark_url: pick(raw, 'logo_dark_url', 'LogoDarkURL', ''),
    favicon_url: pick(raw, 'favicon_url', 'FaviconURL', ''),
    social_image_url: pick(raw, 'social_image_url', 'SocialImageURL', ''),
    colors: pick(raw, 'colors', 'Colors', {}),
    typography: pick(raw, 'typography', 'Typography', {}),
    shape: pick(raw, 'shape', 'Shape', {}),
    layout: pick(raw, 'layout', 'Layout', {}),
    contact: pick(raw, 'contact', 'Contact', {}),
    social_links: pick(raw, 'social_links', 'SocialLinks', []),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeDomainBinding(raw: RawRecord): LandingDomainBinding {
  return {
    id: pick(raw, 'id', 'ID', ''),
    organization_domain_id: pick(raw, 'organization_domain_id', 'OrganizationDomainID', ''),
    landing_page_id: pick(raw, 'landing_page_id', 'LandingPageID', ''),
    is_primary: pick(raw, 'is_primary', 'IsPrimary', false),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeAvailableDomain(raw: RawRecord): LandingAvailableDomain {
  return {
    ...raw,
    id: pick(raw, 'id', 'ID', ''),
    domain: pick(raw, 'domain', 'Domain', undefined),
    hostname: pick(raw, 'hostname', 'Hostname', pick(raw, 'host', 'Host', undefined)),
    status: pick(raw, 'status', 'Status', undefined),
    is_primary: pick(raw, 'is_primary', 'IsPrimary', undefined),
  }
}

function normalizeTemplate(raw: RawRecord): SectionTemplate {
  return {
    id: pick(raw, 'id', 'ID', ''),
    name: pick(raw, 'name', 'Name', ''),
    description: pick(raw, 'description', 'Description', ''),
    section_type: pick(raw, 'section_type', 'SectionType', ''),
    content: pick(raw, 'content', 'Content', {}),
    style: pick(raw, 'style', 'Style', {}),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeMedia(raw: RawRecord): LandingMedia {
  return {
    id: pick(raw, 'id', 'ID', ''),
    storage_key: pick(raw, 'storage_key', 'StorageKey', undefined),
    filename: pick(raw, 'filename', 'Filename', ''),
    mime_type: pick(raw, 'mime_type', 'MimeType', ''),
    size_bytes: pick(raw, 'size_bytes', 'SizeBytes', 0),
    width: pick(raw, 'width', 'Width', null),
    height: pick(raw, 'height', 'Height', null),
    duration_seconds: pick(raw, 'duration_seconds', 'DurationSeconds', null),
    alt_text: pick(raw, 'alt_text', 'AltText', ''),
    processing_status: pick(raw, 'processing_status', 'ProcessingStatus', ''),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeMenu(raw: RawRecord): LandingMenu {
  return {
    id: pick(raw, 'id', 'ID', ''),
    name: pick(raw, 'name', 'Name', ''),
    location: pick(raw, 'location', 'Location', ''),
    is_active: pick(raw, 'is_active', 'IsActive', false),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeMenuItem(raw: RawRecord): LandingMenuItem {
  const children = pick<RawRecord[]>(raw, 'children', 'Children', [])
  return {
    id: pick(raw, 'id', 'ID', ''),
    parent_id: pick(raw, 'parent_id', 'ParentID', null),
    label: pick(raw, 'label', 'Label', ''),
    link_type: pick(raw, 'link_type', 'LinkType', 'internal_page'),
    destination: pick(raw, 'destination', 'Destination', ''),
    target: pick(raw, 'target', 'Target', 'self'),
    sort_order: pick(raw, 'sort_order', 'SortOrder', 0),
    is_enabled: pick(raw, 'is_enabled', 'IsEnabled', true),
    children: children.map(normalizeMenuItem),
  }
}

function normalizeRevision(raw: RawRecord): LandingRevision {
  return {
    id: pick(raw, 'id', 'ID', ''),
    landing_page_id: pick(raw, 'landing_page_id', 'LandingPageID', ''),
    revision_number: pick(raw, 'revision_number', 'RevisionNumber', undefined),
    version: pick(raw, 'version', 'Version', undefined),
    change_note: pick(raw, 'change_note', 'ChangeNote', ''),
    snapshot: pick(raw, 'snapshot', 'Snapshot', {}),
    created_by: pick(raw, 'created_by', 'CreatedBy', ''),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
  }
}

function normalizeIntegration(raw: RawRecord): LandingIntegration {
  return {
    id: pick(raw, 'id', 'ID', ''),
    name: pick(raw, 'name', 'Name', ''),
    type: pick(raw, 'type', 'Type', ''),
    credentials: pick(raw, 'credentials', 'Credentials', {}),
    event_filters: pick(raw, 'event_filters', 'EventFilters', []),
    is_active: pick(raw, 'is_active', 'IsActive', false),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function normalizeDelivery(raw: RawRecord): LandingDeliveryLog {
  return {
    id: pick(raw, 'id', 'ID', ''),
    integration_id: pick(raw, 'integration_id', 'IntegrationID', ''),
    submission_id: pick(raw, 'submission_id', 'SubmissionID', ''),
    status: pick(raw, 'status', 'Status', 'pending'),
    attempts: pick(raw, 'attempts', 'Attempts', 0),
    error_message: pick(raw, 'error_message', 'ErrorMessage', null),
    response_payload: pick(raw, 'response_payload', 'ResponsePayload', null),
    next_retry_at: pick(raw, 'next_retry_at', 'NextRetryAt', null),
    created_at: pick(raw, 'created_at', 'CreatedAt', ''),
    updated_at: pick(raw, 'updated_at', 'UpdatedAt', ''),
  }
}

function mapList<T>(
  response: PaginatedResponse<RawRecord>,
  mapper: (raw: RawRecord) => T,
): PaginatedResponse<T> {
  return {
    ...response,
    data: response.data.map(mapper),
  }
}

function emptyMeta(): PaginatedResponse<never>['meta'] {
  return {
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0,
  }
}

function normalizeList<T>(payload: T[] | ListEnvelope<T> | null | undefined): PaginatedResponse<T> {
  if (!payload) {
    return {
      success: true,
      message: '',
      data: [],
      meta: emptyMeta(),
    }
  }

  if (Array.isArray(payload)) {
    return {
      success: true,
      message: '',
      data: payload,
      meta: {
        ...emptyMeta(),
        total: payload.length,
        total_pages: payload.length > 0 ? 1 : 0,
      },
    }
  }

  return {
    success: true,
    message: '',
    data: payload.items ?? [],
    meta: payload.meta ?? emptyMeta(),
  }
}

async function getData<T>(url: string, params?: QueryParams): Promise<T> {
  const response = await http.get<ApiEnvelope<T>>(url, { params })
  return response.data.data
}

async function getList<T>(url: string, params?: QueryParams): Promise<PaginatedResponse<T>> {
  return normalizeList(await getData<T[] | ListEnvelope<T> | null>(url, params))
}

async function postData<T, TPayload = unknown>(
  url: string,
  payload?: TPayload,
): Promise<BaseResponse<T>> {
  const response = await http.post<ApiEnvelope<T>>(url, payload)
  return {
    success: response.data.success,
    message: response.data.message ?? '',
    data: response.data.data,
    meta: null,
  }
}

async function postFormData<T>(url: string, payload: FormData): Promise<BaseResponse<T>> {
  const response = await http.post<ApiEnvelope<T>>(url, payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return {
    success: response.data.success,
    message: response.data.message ?? '',
    data: response.data.data,
    meta: null,
  }
}

async function patchData<T, TPayload = unknown>(
  url: string,
  payload?: TPayload,
): Promise<BaseResponse<T>> {
  const response = await http.patch<ApiEnvelope<T>>(url, payload)
  return {
    success: response.data.success,
    message: response.data.message ?? '',
    data: response.data.data,
    meta: null,
  }
}

async function putData<T, TPayload = unknown>(
  url: string,
  payload?: TPayload,
): Promise<BaseResponse<T>> {
  const response = await http.put<ApiEnvelope<T>>(url, payload)
  return {
    success: response.data.success,
    message: response.data.message ?? '',
    data: response.data.data,
    meta: null,
  }
}

async function deleteData<T = null>(url: string): Promise<BaseResponse<T>> {
  const response = await http.delete<ApiEnvelope<T>>(url)
  return {
    success: response.data.success,
    message: response.data.message ?? '',
    data: response.data.data,
    meta: null,
  }
}

async function getBase<T>(url: string, params?: QueryParams): Promise<BaseResponse<T>> {
  const response = await http.get<ApiEnvelope<T>>(url, { params })
  return {
    success: response.data.success,
    message: response.data.message ?? '',
    data: response.data.data,
    meta: null,
  }
}

export const landingApi = {
  getPages: async (params?: QueryParams) =>
    mapList(
      await getList<RawRecord>('/admin/landing-pages', {
        is_template: false,
        ...params,
      }),
      normalizePage,
    ),
  getTemplatePages: async (params?: QueryParams) => {
    const response = mapList(
      await getList<RawRecord>('/admin/landing-pages', {
        ...params,
        is_template: true,
      }),
      normalizePage,
    )
    return {
      ...response,
      data: response.data.map((page) => ({ ...page, is_template: true })),
    }
  },
  getPage: async (id: string) => {
    const response = await getBase<RawRecord>(`/admin/landing-pages/${id}`)
    return { ...response, data: normalizePage(response.data) }
  },
  createPage: async (data: unknown) => {
    const response = await postData<RawRecord>('/admin/landing-pages', data)
    return { ...response, data: normalizePage(response.data) }
  },
  updatePage: (id: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing-pages/${id}`, data).then((response) => ({
      ...response,
      data: normalizePage(response.data),
    })),
  deletePage: (id: string) => deleteData<null>(`/admin/landing-pages/${id}`),
  updateAccess: (id: string, data: unknown) =>
    putData<null>(`/admin/landing-pages/${id}/access`, data),
  duplicatePage: (id: string, data: unknown) =>
    postData<RawRecord>(`/admin/landing-pages/${id}/duplicate`, data).then((response) => ({
      ...response,
      data: normalizePage(response.data),
    })),
  archivePage: (id: string) => postData<null>(`/admin/landing-pages/${id}/archive`),
  restorePage: (id: string) => postData<null>(`/admin/landing-pages/${id}/restore`),
  updateSEO: (id: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing-pages/${id}/seo`, data).then((response) => ({
      ...response,
      data: normalizePage(response.data),
    })),
  publishPage: (id: string) => postData<LandingRevision>(`/admin/landing-pages/${id}/publish`),
  unpublishPage: (id: string) => postData<null>(`/admin/landing-pages/${id}/unpublish`),
  schedulePage: (id: string, data: unknown) =>
    putData<null>(`/admin/landing-pages/${id}/schedule`, data),
  cancelSchedule: (id: string) => deleteData<null>(`/admin/landing-pages/${id}/schedule`),

  getSections: async (id: string) => {
    const response = await getBase<RawRecord[]>(`/admin/landing-pages/${id}/sections`)
    return { ...response, data: response.data.map(normalizeSection) }
  },
  createSection: (id: string, data: unknown) =>
    postData<RawRecord>(`/admin/landing-pages/${id}/sections`, data).then((response) => ({
      ...response,
      data: normalizeSection(response.data),
    })),
  updateSection: (id: string, sectionId: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing-pages/${id}/sections/${sectionId}`, data).then(
      (response) => ({
        ...response,
        data: normalizeSection(response.data),
      }),
    ),
  deleteSection: (id: string, sectionId: string) =>
    deleteData<null>(`/admin/landing-pages/${id}/sections/${sectionId}`),
  reorderSections: (id: string, data: unknown) =>
    putData<null>(`/admin/landing-pages/${id}/sections/reorder`, data),

  getForms: async (id: string) => {
    const response = await getBase<RawRecord[]>(`/admin/landing-pages/${id}/forms`)
    return { ...response, data: response.data.map(normalizeForm) }
  },
  createForm: (id: string, data: unknown) =>
    postData<RawRecord>(`/admin/landing-pages/${id}/forms`, data).then((response) => ({
      ...response,
      data: normalizeForm(response.data),
    })),
  updateForm: (id: string, formId: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing-pages/${id}/forms/${formId}`, data).then((response) => ({
      ...response,
      data: normalizeForm(response.data),
    })),
  deleteForm: (id: string, formId: string) =>
    deleteData<null>(`/admin/landing-pages/${id}/forms/${formId}`),
  replaceFormFields: (id: string, formId: string, data: unknown) =>
    putData<RawRecord[]>(`/admin/landing-pages/${id}/forms/${formId}/fields`, data).then(
      (response) => ({
        ...response,
        data: response.data.map(normalizeFormField),
      }),
    ),

  getDefaultBranding: async () => {
    const response = await getBase<RawRecord>('/admin/landing/branding')
    return { ...response, data: normalizeBranding(response.data) }
  },
  updateDefaultBranding: (data: unknown) =>
    patchData<RawRecord>('/admin/landing/branding', data).then((response) => ({
      ...response,
      data: normalizeBranding(response.data),
    })),
  getPageBranding: async (id: string) => {
    const response = await getBase<RawRecord>(`/admin/landing-pages/${id}/branding`)
    return { ...response, data: normalizeBranding(response.data) }
  },
  updatePageBranding: (id: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing-pages/${id}/branding`, data).then((response) => ({
      ...response,
      data: normalizeBranding(response.data),
    })),
  deletePageBranding: (id: string) => deleteData<null>(`/admin/landing-pages/${id}/branding`),

  getAvailableDomains: async () => {
    const response = await getBase<RawRecord[]>('/admin/landing/domains/available')
    return { ...response, data: response.data.map(normalizeAvailableDomain) }
  },
  getDomainBindings: async (landingPageId: string) => {
    const response = await getBase<RawRecord[]>('/admin/landing/domain-bindings', {
      landing_page_id: landingPageId,
    })
    return { ...response, data: response.data.map(normalizeDomainBinding) }
  },
  createDomainBinding: (data: unknown) =>
    postData<RawRecord>('/admin/landing/domain-bindings', data).then((response) => ({
      ...response,
      data: normalizeDomainBinding(response.data),
    })),
  updateDomainBinding: (id: string, data: unknown) =>
    patchData<null>(`/admin/landing/domain-bindings/${id}`, data),
  deleteDomainBinding: (id: string) => deleteData<null>(`/admin/landing/domain-bindings/${id}`),

  getRevisions: async (id: string) => {
    const response = await getBase<RawRecord[]>(`/admin/landing-pages/${id}/revisions`)
    return { ...response, data: response.data.map(normalizeRevision) }
  },
  restoreRevision: (id: string, revision: string) =>
    postData<RawRecord>(`/admin/landing-pages/${id}/revisions/${revision}/restore`).then(
      (response) => ({ ...response, data: normalizePage(response.data) }),
    ),

  getMedia: async (params?: QueryParams) =>
    mapList(await getList<RawRecord>('/admin/landing/media', params), normalizeMedia),
  uploadMedia: async (data: FormData) => {
    const response = await postFormData<RawRecord>('/admin/landing/media', data)
    return { ...response, data: normalizeMedia(response.data) }
  },
  deleteMedia: (id: string) => deleteData<null>(`/admin/landing/media/${id}`),

  getCTAs: async (params?: QueryParams) =>
    mapList(await getList<RawRecord>('/admin/landing/ctas', params), normalizeCTA),
  createCTA: async (data: unknown) => {
    const response = await postData<RawRecord>('/admin/landing/ctas', data)
    return { ...response, data: normalizeCTA(response.data) }
  },
  updateCTA: (id: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing/ctas/${id}`, data).then((response) => ({
      ...response,
      data: normalizeCTA(response.data),
    })),
  deleteCTA: (id: string) => deleteData<null>(`/admin/landing/ctas/${id}`),

  getTemplates: (params?: QueryParams) =>
    getList<RawRecord>('/admin/landing/section-templates', params).then((response) =>
      mapList(response, normalizeTemplate),
    ),
  createTemplate: (data: unknown) =>
    postData<RawRecord>('/admin/landing/section-templates', data).then((response) => ({
      ...response,
      data: normalizeTemplate(response.data),
    })),
  updateTemplate: (id: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing/section-templates/${id}`, data).then((response) => ({
      ...response,
      data: normalizeTemplate(response.data),
    })),
  deleteTemplate: (id: string) => deleteData<null>(`/admin/landing/section-templates/${id}`),
  instantiateTemplate: (id: string, data: unknown) =>
    postData<RawRecord>(`/admin/landing-pages/${id}/sections/from-template`, data).then(
      (response) => ({
        ...response,
        data: normalizeSection(response.data),
      }),
    ),

  getMenus: async (params?: QueryParams) =>
    mapList(await getList<RawRecord>('/admin/landing/menus', params), normalizeMenu),
  createMenu: async (data: unknown) => {
    const response = await postData<RawRecord>('/admin/landing/menus', data)
    return { ...response, data: normalizeMenu(response.data) }
  },
  updateMenu: (id: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing/menus/${id}`, data).then((response) => ({
      ...response,
      data: normalizeMenu(response.data),
    })),
  deleteMenu: (id: string) => deleteData<null>(`/admin/landing/menus/${id}`),

  getMenuItems: async (id: string) => {
    const response = await getBase<RawRecord[]>(`/admin/landing/menus/${id}/items`)
    return { ...response, data: response.data.map(normalizeMenuItem) }
  },
  createMenuItem: (id: string, data: unknown) =>
    postData<RawRecord>(`/admin/landing/menus/${id}/items`, data).then((response) => ({
      ...response,
      data: normalizeMenuItem(response.data),
    })),
  updateMenuItem: (id: string, itemId: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing/menus/${id}/items/${itemId}`, data).then((response) => ({
      ...response,
      data: normalizeMenuItem(response.data),
    })),
  deleteMenuItem: (id: string, itemId: string) =>
    deleteData<null>(`/admin/landing/menus/${id}/items/${itemId}`),
  reorderMenuItems: (id: string, data: unknown) =>
    putData<null>(`/admin/landing/menus/${id}/items/reorder`, data),

  getIntegrations: (params?: QueryParams) =>
    getList<RawRecord>('/admin/landing/lead-integrations', params).then((response) =>
      mapList(response, normalizeIntegration),
    ),
  createIntegration: (data: unknown) =>
    postData<RawRecord>('/admin/landing/lead-integrations', data).then((response) => ({
      ...response,
      data: normalizeIntegration(response.data),
    })),
  updateIntegration: (id: string, data: unknown) =>
    patchData<RawRecord>(`/admin/landing/lead-integrations/${id}`, data).then((response) => ({
      ...response,
      data: normalizeIntegration(response.data),
    })),
  deleteIntegration: (id: string) => deleteData<null>(`/admin/landing/lead-integrations/${id}`),
  testIntegration: (id: string) => postData<unknown>(`/admin/landing/lead-integrations/${id}/test`),

  getDeliveries: (params?: QueryParams) =>
    getList<RawRecord>('/admin/landing/lead-deliveries', params).then((response) =>
      mapList(response, normalizeDelivery),
    ),
  retryDelivery: (id: string) => postData<null>(`/admin/landing/lead-deliveries/${id}/retry`),

  /**
   * Public API — tidak memerlukan auth.
   * Digunakan oleh renderer untuk mengambil data landing page berdasarkan slug.
   */
  getPublicPage: async (slug: string) => {
    const response = await http.get<ApiEnvelope<RawRecord>>(`/public/landing/resolve?slug=${slug}`)
    return response.data.data ?? response.data
  },
}
