# THE DARK
Complete Cloudflare Pages cybersecurity website.

## Deploy
- Upload/deploy this project to the Cloudflare Pages project `the-dark`.
- Apply `schema.sql` to the existing D1 database.
- Keep the D1/KV bindings from `wrangler.toml`.
- Optional password-reset email: set `RESEND_API_KEY` and `RESET_FROM_EMAIL` in Pages environment variables.
- Promote your own account to admin with:
`UPDATE users SET role='admin' WHERE email='YOUR_EMAIL';`

Authorized defensive cybersecurity only.
