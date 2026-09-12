# The Dark — Cloudflare-ready website

This is a clean rebuild based on the supplied Product Requirements Document.

## Included
- Dark futuristic cybersecurity design
- Responsive public website
- Contact Me form
- Work With Me form
- Server-side validation and sanitization
- Honeypot anti-spam field
- IP-based rate limiting using Cloudflare KV
- Secure database storage using Cloudflare D1
- Security headers in Pages middleware
- Optional real email notifications through Resend
- No secrets in frontend code

## Important
The forms **store submissions in D1 immediately** once D1 is configured. Email notifications are sent only when `RESEND_API_KEY` and `MAIL_FROM` are configured.

The Emergent-managed Google sign-in cannot be copied automatically into this standalone project. Google OAuth needs a Google Cloud OAuth client and a backend identity flow. For the admin area, a safer first deployment is Cloudflare Access or another managed identity provider.

## Deploy
1. Create a GitHub repository and upload this project.
2. In Cloudflare Pages, connect the GitHub repository.
3. Create a D1 database named `the-dark-db`.
4. Put the returned database ID into `wrangler.toml`.
5. Create a KV namespace and put its ID into `wrangler.toml`.
6. Run the SQL in `schema.sql` against D1.
7. Add `RESEND_API_KEY` and `MAIL_FROM` as encrypted environment variables if you want actual email notifications.
8. Deploy through Cloudflare Pages/Workers.

## Local structure
- `public/` — frontend
- `functions/` — Cloudflare Pages Functions backend
- `schema.sql` — D1 database schema
- `wrangler.toml` — Cloudflare bindings

## Security note
This project is for authorized, defensive cybersecurity work only. It does not include exploit, credential theft, malware, or unauthorized access features.
Email configuration update
