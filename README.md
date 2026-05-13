# The Curated Life

Premium launch MVP for a private, reference-only lifestyle experiences brand.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Prisma ORM with Neon PostgreSQL
- Better Auth with Google OAuth
- Nodemailer with Hostinger SMTP
- Vercel hosting

## Local Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Fill the required values:

```bash
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="The Curated Life <hello@thecuratedlife.in>"
ADMIN_EMAILS=founder@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Generate Prisma Client and deploy the schema:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Run the app:

```bash
npm run dev
```

## Launch Flow

1. Public visitors request access at `/request-access`.
2. Requests save as `PENDING` and receive a receipt email.
3. Admins listed in `ADMIN_EMAILS` review at `/admin`.
4. Approval creates or updates a member profile and sends the login link.
5. Approved members log in through Google at `/login`.
6. Members use `/member` for invitations, reservations, and warm referrals.

Google OAuth alone never grants access. The server checks the approved user record before creating private sessions.
