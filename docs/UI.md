# Career Copilot Portal UI

## Route map

| Route | Description |
| --- | --- |
| `/` | Landing page with hero, features, and CTA. |
| `/login` | User login form with validation. |
| `/register` | User registration form with validation. |
| `/onboarding` | 4-step onboarding wizard (profile, docs, CSV import, matching). |
| `/dashboard` | KPI cards + charts (match distribution, salary bands, pipeline). |
| `/vacancies` | Filterable vacancies list with pagination. |
| `/vacancies/[id]` | Vacancy details view. |
| `/matches` | Match list with missing skills + generate package action. |
| `/documents` | Uploaded documents list with extracted JSON preview. |
| `/packages/[id]` | Generated package viewer with tabs + download + PDF export templates. |

## Key components

- `components/app-shell.tsx`: top nav + sidebar layout.
- `components/ui/*`: shadcn-inspired UI primitives (button, card, table, tabs, etc.).
- `app/providers.tsx`: React Query + theme + toast providers.

## API integrations

- Auth: `/auth/login`, `/auth/register`, `/auth/refresh`
- Profile: `/me/profile`
- Documents: `/me/documents`, `/me/documents/upload`
- Vacancies: `/vacancies`, `/vacancies/import/csv`
- Matching: `/matching/run`
- Matches: `/me/matches`
- Packages: `/me/generated/{package_id}`, `/me/generated/{package_id}/export/pdf`
- Stats: `/me/stats`
- Applications: `/me/applications`, `/me/applications/{vacancy_id}`

## Data flow

- TanStack Query caches API responses and powers loading states.
- Zustand persists access + refresh tokens in localStorage.
- Toasts (Sonner) communicate success/errors.
- Client-side pagination is used for long lists.

## Sample CSV

Use `docs/sample_vacancies.csv` for vacancy imports during onboarding.
