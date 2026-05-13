# The Curated Life

Premium launch MVP for a private, reference-only lifestyle experiences brand.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Prisma ORM with Neon PostgreSQL
- Custom email/password auth with approved-member sessions
- Nodemailer with Hostinger SMTP
- Vercel hosting

## Local Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Fill the required values:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/curated_life?schema=public"
ADMIN_EMAILS="founder@example.com"
ADMIN_NOTIFICATION_EMAIL="thecuratedlife.india@gmail.com"
SMTP_HOST=""
SMTP_PORT=465
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="The Curated Life <hello@thecuratedlife.in>"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
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
4. Approval creates or updates a member profile and sends a password setup link.
5. Approved members set a password, then log in with email and password at `/login`.
6. Members use `/member` for invitations, reservations, and warm referrals.

Login alone never grants access. The server checks the approved user record before creating private sessions.
