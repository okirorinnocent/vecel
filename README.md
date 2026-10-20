# JS Health Initiative East Africa — Website

Official website for **JS Health Initiative East Africa**, a Ugandan non-profit (company limited by guarantee, based in Mbarara) working on digital skilling, public health education, research and innovation, surgical care support, and youth empowerment.

The site is a lightweight, **static front end** (plain HTML, CSS and JavaScript, no build step) backed by **[Supabase](https://supabase.com)** for the database, authentication, file storage and serverless edge functions. Donations are processed through **Flutterwave**.

## Features

**Public site**
- Home page with mission, focus areas and a live "Latest updates" feed
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
- Post public updates with an optional image
- Email all active subscribers

## Project structure

```
├── index.html        # Home page
├── volunteer.html    # Volunteer application form
├── contact.html      # Contact details and message form
├── donate.html       # Donation form
├── admin.html        # Admin dashboard (noindex)
├── admin.js          # Admin logic (auth, tables, compose, broadcast)
├── app.js            # Shared logic: nav/footer, form handling, API helper, updates feed
├── config.js         # Supabase URL and public (publishable) key
├── style.css         # Main styles
└── extra.css         # Forms, admin tables, banners and other additions
```

## Tech stack

| Layer | Technology |
|---|---|
| Front end | HTML, CSS, vanilla JavaScript |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Payments | Flutterwave (hosted checkout) |
| Client library | `@supabase/supabase-js` v2.45.4 (loaded from jsDelivr, admin page only) |

## How it works

- `app.js` injects the shared navigation and footer into every page and wires up any `<form data-type="...">`. Supported types are `contact`, `volunteer`, `subscribe` and `donate`.
- Forms post to Supabase Edge Functions at `<SUPABASE_URL>/functions/v1/`:
  - `submit`: handles contact, volunteer, subscribe, unsubscribe and (admin-only) broadcast requests
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

**Storage:** a public bucket named `updates` for update images.

**Edge Functions:** `submit` and `donate` (store secrets such as the Flutterwave secret key and your email provider key as Supabase function secrets, never in this repo).

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

## Customisation

- **Brand colour:** change `--accent` and `--accent-dark` in `:root` at the top of `style.css`
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
