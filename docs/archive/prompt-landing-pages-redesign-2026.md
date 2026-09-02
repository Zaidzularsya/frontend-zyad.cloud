> **Arsip — bukan instruksi aktif.** Prompt task lama untuk redesign halaman
> `/platform/platform-landing-pages/pages`, dipindahkan dari root repo ke sini agar tidak salah dibaca
> sebagai instruksi berlaku oleh AI agent baru. Merujuk path lama `/home/yulianto/frontend.zyad.cloud`
> yang sudah tidak sesuai struktur repo saat ini (`/home/yulianto/zyad.cloud/frontend`). Untuk instruksi
> kerja yang berlaku, lihat `AGENTS.md` / `CLAUDE.md` di root repo.

---

You are an expert Senior Frontend Engineer and UI/UX Designer.

I need you to enhance the frontend UI/UX and development quality for the Landing Page Management sub-menu, specifically only this target page:

Target URL:
http://localhost:5173/platform/platform-landing-pages/pages

Target frontend repository:
/home/yulianto/frontend.zyad.cloud

Backend/API reference repository:
/home/yulianto/zyad.cloud

Important scope:

- Focus ONLY on the frontend page related to:
  /platform/platform-landing-pages/pages
- Do NOT redesign unrelated pages.
- Do NOT modify unrelated modules unless required for shared reusable components.
- Use the existing frontend architecture, routing, components, store/composable patterns, API client patterns, and styling conventions already used in /home/yulianto/frontend.zyad.cloud.
- Use the backend/API reference from /home/yulianto/zyad.cloud to understand available endpoints, payloads, DTOs, response structure, and expected landing page data model.

Main goal:
Improve the UI/UX and frontend development quality for the Platform Landing Pages → Pages management page so it feels like a professional SaaS admin page / website builder management page.

Context:
This page is part of a Landing Page / Website Builder module. The purpose of the page is to manage reusable landing pages/company profile pages. A page can have slug, layout/template, SEO metadata, status, and sections. The frontend should help admin users manage landing pages clearly and efficiently.

Expected UX direction:
The page should feel like a modern SaaS management dashboard, not a raw CRUD table.

Please inspect the existing implementation first:

1. Locate the route/component for:
   /platform/platform-landing-pages/pages
2. Understand current components, API calls, types, services, stores, and UI patterns.
3. Check if there are existing reusable table, button, modal, form, badge, dropdown, empty state, loading state, toast, and confirmation components.
4. Check the API reference in /home/yulianto/zyad.cloud before changing request/response assumptions.

Enhancement requirements:

1. Page Header
   Improve the page header with:

- Clear title: "Landing Pages" or equivalent based on existing language convention.
- Helpful description explaining that this page manages reusable landing/company profile pages.
- Primary action button: "Create Page" / "Tambah Halaman".
- Optional secondary action if relevant: "View Templates" or "Manage Templates", but only if route exists.
- Clean breadcrumb if the app already has breadcrumb pattern.

2. Stats / Summary Cards
   Add useful summary cards if data is available or can be derived from list response:

- Total pages
- Published pages
- Draft pages
- Archived/inactive pages if supported
- Recently updated count if possible

If API does not provide summary endpoint, derive from currently loaded list data. Do not create fake API assumptions.

3. Filter and Search UX
   Improve filtering:

- Search by title, slug, or keyword.
- Filter by status: all, draft, published, archived/inactive if supported.
- Filter by template/layout if data exists.
- Sort options: newest, recently updated, title A-Z, status if possible.
- Add reset filter action.
- Keep the UI clean and not overcrowded.

4. Landing Page List UI
   Improve the list/table/card UI to show important information clearly:

- Page title
- Slug/path
- Status badge
- Template/layout
- Number of sections if available
- SEO/meta completeness indicator if available
- Last updated date
- Actions:

  - Edit
  - Builder / Manage Sections if route exists
  - Preview if supported
  - Publish / Unpublish if supported by API
  - Duplicate if supported by API or can be implemented safely
  - Delete with confirmation if supported

Use a professional table layout for desktop. If the existing design system supports cards, also make responsive mobile layout readable.

5. Empty State
   Create a better empty state when there are no landing pages:

- Friendly icon/illustration if existing icon library is available.
- Title: "No landing pages yet"
- Description: explain that user can create a reusable company profile, SaaS landing, or product page.
- CTA button: "Create First Page"

6. Loading and Error State
   Improve:

- Skeleton loading or clean loading state.
- Error state with retry button.
- Avoid blank page.
- Avoid console-only errors.

7. Create/Edit Page Flow
   If create/edit modal/page already exists, enhance it:
   Fields should follow API schema, but generally include:

- Page title
- Slug
- Template/layout
- Status
- Meta title
- Meta description
- Open Graph image if supported
- Description/internal notes if supported

UX rules:

- Slug should be auto-generated from title but still editable.
- Validate required fields.
- Show clear validation messages.
- Prevent duplicate submit.
- Use existing toast/notification pattern.
- Keep form layout clean and grouped:

  - Basic Info
  - SEO
  - Publishing
  - Layout/Template

Do not invent backend fields. Match the existing API.

8. Section Awareness
   Because landing pages are built from reusable sections, the Pages list should show section-related context when possible:

- Section count
- "Manage Sections" action if route exists
- Helpful hint that section content is managed inside the page builder/detail page
- Do not implement full section builder unless it already exists and is directly part of this route.

9. Status and Publishing UX
   Improve status display:

- Use clear badges for draft/published/archived/inactive.
- If publish/unpublish API exists, add confirmation flow.
- If not, only show status and do not create fake behavior.

10. Preview UX
    If preview route or public slug exists:

- Add preview/open action.
- Open in new tab if appropriate.
- Use safe URL construction based on existing app route config.
- If preview is not available, do not force it.

11. Code Quality
    Ensure the implementation:

- Uses TypeScript properly.
- Avoids `any` unless absolutely necessary.
- Defines or improves Landing Page types/interfaces based on API response.
- Uses existing API client/composable/store patterns.
- Keeps components small and maintainable.
- Extracts reusable pieces only when beneficial:

  - StatusBadge
  - PageStatsCard
  - PageFilters
  - PageFormModal
  - EmptyState

- Does not introduce unnecessary dependencies.
- Follows existing lint, formatting, and naming conventions.
- Ensures responsive layout.

12. Visual Design Direction
    Make it visually polished:

- Consistent spacing
- Clear information hierarchy
- Good contrast
- Modern SaaS admin feel
- Clean action buttons
- Proper badges
- Avoid overcrowded layout
- Make primary action obvious
- Make dangerous action visually distinct but not too aggressive

13. Safety Constraints
    Do not:

- Modify backend code.
- Modify unrelated frontend routes.
- Break existing routing.
- Remove existing functionality.
- Hardcode fake data.
- Invent API endpoints without checking /home/yulianto/zyad.cloud.
- Add large UI libraries unless already used.
- Use `any` casually.
- Leave TODO placeholders for important logic.

14. Verification
    After implementation, run the available checks for the frontend repo:

- install dependencies only if needed
- run lint
- run typecheck if available
- run build if available

Common commands to check package.json first:

- npm run lint
- npm run typecheck
- npm run build

If commands fail due to existing unrelated issues, clearly report:

- what command failed
- whether it is caused by your changes or pre-existing issues
- the exact files/errors relevant to this task

15. Deliverables
    At the end, provide a concise summary:

- Files changed
- UI/UX improvements made
- API assumptions confirmed from backend reference
- Any limitations
- How to test manually at:
  http://localhost:5173/platform/platform-landing-pages/pages

Manual testing checklist:

- Page loads correctly
- Search works
- Filters work
- Create page flow works if supported
- Edit page flow works if supported
- Delete confirmation works if supported
- Status badge is correct
- Empty state appears correctly
- Loading/error states are handled
- Responsive layout works
- No unrelated page is broken

Start by inspecting both repositories and then implement the improvements.
