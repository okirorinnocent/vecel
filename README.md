# JS Health Initiative East Africa — Website

Official website for **JS Health Initiative East Africa**, a Ugandan non-profit (company limited by guarantee, based in Mbarara) working on biomedical engineering volunteer services, public health education, research and innovation, surgical care support, and youth empowerment.

The site is a lightweight, **static front end** (plain HTML, CSS and JavaScript, no build step) backed by **[Supabase](https://supabase.com)** for the database, authentication, file storage and serverless edge functions. Donations are processed through **Flutterwave**.

## Features

**Public site**
- Home page with mission, admin-managed program cards linking to their own pages, and a live "Latest updates" feed
- Team, cooperating partners and biomedical engineering services pages, with published Supabase content and safe static fallbacks
- Service-request form for facilities, including email confirmation and admin notification
- Volunteer application form
- Contact form
- Donation page (USD, EUR, GBP, UGX) with quick-amount buttons and a payment success/failure banner
- Newsletter subscription (footer on every page) with one-click unsubscribe links
- Spam protection via a hidden honeypot field on all public forms
- Responsive, mobile-friendly design

**Admin dashboard** (`/admin` or `admin.html`)
- Email and password sign-in, restricted to users listed in the `admins` table
- View volunteer applications, contact messages, subscribers, donations and updates
- Change the status of applications and messages (`new`, `reviewed`, `contacted`, `done`)
- Donation totals per currency (successful payments only)
- Add, edit, reorder, hide and delete program cards and their pages, including biomedical engineering volunteer services
- Manage team members, partner organisations, published services and service-request status
- Upload or remove team photos and partner logos through the public `team-photos` and `partner-logos` buckets
- Post public updates with an optional image
- Email all active subscribers

## Project structure

```
├── index.html        # Home page
├── team.html         # Published team profiles
├── partners.html     # Published cooperating partners
├── services.html     # Biomedical engineering services and request form
├── volunteer.html    # Volunteer application form
├── contact.html      # Contact details and message form
├── get-involved.html # Journeys for donors, volunteers, partners, communities + partner form
├── STORY-TEMPLATE.md # Consent checklist and structure for impact stories
├── donate.html       # Donation form
├── admin.html        # Admin dashboard (noindex)
├── admin.js          # Admin logic (auth, tables, compose, broadcast)
├── admin-programs.js # Admin "programs" tab: add/edit/reorder/hide/delete program cards
├── admin-content.js  # Admin team, partners, services and service-request tabs
├── team.js           # Team loader and initials fallback
├── partners.js       # Partner loader and type filter
├── services.js       # Service loader and request-form options
├── program.html      # Program detail page (loads ?slug=... from the database)
├── programs.js       # Renders home-page program cards and the detail page
├── home.css          # Home page design (hero, focus-area cross, about, closing banner)
├── programs.css      # Styles for program cards and detail page
├── app.js            # Shared logic: nav/footer, form handling, API helper, updates feed
├── config.js         # Supabase URL and public (publishable) key
├── style.css         # Main styles (forms, admin tables and banners included)
├── vercel.json       # Vercel security headers and the /admin rewrite
└── supabase/
    ├── programs.sql  # Run once in the Supabase SQL Editor (programs table, RLS, seed data)
    ├── programs-content.sql  # Run after programs.sql: real page text for the five programs
    └── field-notes-drafts.sql  # Unpublished field-note drafts to fill with real details
```

## Tech stack

| Layer | Technology |
|---|---|
| Front end | HTML, CSS, vanilla JavaScript |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Payments | Flutterwave (hosted checkout) |
| Client library | `@supabase/supabase-js` v2.45.4 (loaded from jsDelivr, admin page only) |

## How it works

- `app.js` injects the shared navigation and footer into every page and wires up any `<form data-type="...">`. Supported types include `contact`, `volunteer`, `subscribe`, `service_request` and `donate`.
- Forms post to Supabase Edge Functions at `<SUPABASE_URL>/functions/v1/`:
  - `submit`: handles contact, volunteer, subscribe, service requests, unsubscribe and (admin-only) broadcast requests
  - `donate`: creates a Flutterwave payment and returns a checkout link
- The home page reads published rows from the `updates` table through the Supabase REST API.
- The admin page signs in with Supabase Auth, then checks that the user exists in the `admins` table before showing the panel.

## Supabase setup

You'll need a Supabase project with the following.

**Tables**

| Table | Columns used by the site |
|---|---|
| `applications` | `id`, `created_at`, `name`, `email`, `phone`, `skills`, `status` |
| `messages` | `id`, `created_at`, `name`, `email`, `message`, `status` |
| `subscribers` | `created_at`, `email`, `active` |
| `donations` | `created_at`, `name`, `email`, `amount`, `currency`, `status` |
| `updates` | `created_at`, `title`, `body`, `image_url`, `published` |
| `admins` | `user_id` |
| `programs` | `id`, `slug`, `title`, `summary`, `body`, `icon`, `link_url`, `sort_order`, `published` (run `supabase/programs.sql`) |
| `team_members` | `id`, `name`, `role_title`, `department`, `bio`, `photo_url`, `email`, `phone`, `linkedin_url`, `show_email`, `show_phone`, `sort_order`, `published` |
| `partners` | `id`, `name`, `partner_type`, `description`, `logo_url`, `website_url`, `partner_since`, `sort_order`, `published` |
| `services` | `id`, `slug`, `title`, `summary`, `body`, `sort_order`, `published` |
| `service_requests` | `id`, `created_at`, `facility_name`, `district`, `contact_name`, `email`, `phone`, `service_type`, `equipment`, `message`, `status` |

**Storage:** public buckets named `updates`, `team-photos` and `partner-logos`; admin write policies should protect all three.

**Edge Functions:** `submit`, `track` and `donate` (store secrets such as the Flutterwave secret key, Turnstile secret and email provider key as Supabase function secrets, never in this repo).

**Row Level Security:** enable RLS on every table. Public visitors should only be able to read published `updates`; all other reads and writes should be limited to admins or handled by the Edge Functions. The `admins` check in `admin.js` is only a UI gate, so RLS is what actually protects your data.

**Auth:** create your admin user in Supabase Auth, then add their user ID to the `admins` table.

## Configuration

Edit `config.js` with your project details:

```js
window.CFG = {
  SUPA: "https://YOUR-PROJECT-REF.supabase.co",
  KEY:  "YOUR_SUPABASE_PUBLISHABLE_KEY"
};
```

> The publishable (anon) key is designed to be public. **Never** put the `service_role` key or any payment secret in this repository.

## Running locally

No build tools are needed. From the project folder, start any static server:

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`.

## Deployment

Because it is a static site, it can be hosted anywhere that serves files, for example:

- **GitHub Pages**: push to GitHub, then Settings → Pages → deploy from the `main` branch
- **Netlify** or **Cloudflare Pages**: connect the repository (no build command, publish directory is the root)

After deploying, add your site URL to the allowed URLs in Supabase Auth settings, and confirm that the Flutterwave redirect URL points back to `donate.html`.

Deploy the service-request changes with:

```bash
supabase functions deploy submit
supabase functions deploy track
supabase functions deploy donate
```

Run `supabase/production-fixes.sql` once. Set these Supabase Function secrets: `RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_EMAIL`, `SITE_URL`, `IP_HASH_SALT`, `TURNSTILE_SECRET`, `FLW_SECRET_KEY`, and `FLW_WEBHOOK_HASH` (or `FLW_SECRET_HASH`). Set the public Turnstile site key as `TURNSTILE_SITE_KEY` in `config.js`. Never put the service-role key or provider secrets in frontend files.

## Test checklist

- Open `team.html`, `partners.html` and `services.html` with published rows and with empty tables; confirm fallbacks and empty states.
- Publish and unpublish a team member or service, then confirm public visibility changes.
- Upload valid and oversized team photos and partner logos; confirm invalid types are rejected and removal clears the URL.
- Submit a service request and confirm the database row, visitor confirmation email and admin notification.
- In the admin service-requests tab, filter by status, update a status and export CSV.
- Complete Turnstile on contact, volunteer, partner, service-request and subscribe forms; reject requests with missing/invalid tokens.
- Confirm public form limits (10/hour/type), subscription action limits (20/hour), email confirmation limit (3/address/day), and that admin broadcasts are not blocked by public limits.
- Run two concurrent broadcast processors and confirm each recipient is claimed once; verify stale `sending` rows are reclaimed after 10 minutes.
- Accept, reject and withdraw cookie consent; verify consent analytics records and deletion of visitor/session identifiers when rejected.
- Verify robots.txt, sitemap.xml, canonical/absolute Open Graph metadata, 404 page and Organization JSON-LD.
- Verify Flutterwave card and UGX mobile-money checkout, invalid amount/currency rejection, webhook signature rejection and idempotent repeated webhooks.

## Customisation

- **Brand colour:** change the shared color tokens in `:root` at the top of `style.css`
- **Navigation and footer:** edit the templates at the top of `app.js`
- **Donation amounts:** edit the `data-a` buttons in `donate.html`
- **Page content and SEO:** edit the text and `<meta name="description">` in each HTML file

## Contact

**JS Health Initiative East Africa Ltd**
Mbarara, Uganda · P.O. Box 424082
Email: jshealthinitiativeeastafrica@gmail.com
Phone: +256 779 607 233

## License

© JS Health Initiative East Africa Ltd. All rights reserved. Add a license file here if you want to open-source the code.
