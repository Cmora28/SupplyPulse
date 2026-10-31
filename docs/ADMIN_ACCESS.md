# Admin access

Admin access is the `User.isAdmin` column. Requests are allowed only when that flag is true in the database. The signed-in email is not an admin check, and there is no built-in admin address.

`requireAdmin()` in `src/lib/admin.ts` is the gate for `/api/admin/**` and for server components. It loads the user from the database. Middleware only reads the `isAdmin` flag on the session token, which the NextAuth jwt callback copies from that same column. Sidebar and mobile nav use `session.user.isAdmin` to show links. Hiding a link is not the security check: admin APIs return 403, and `src/app/(dashboard)/dashboard/admin/layout.tsx` redirects everyone else.

New admin APIs should call `requireAdmin()` and return `access.response` when `access.ok` is false. New pages under `/dashboard/admin` are covered by the layout, but they still must not trust a client-side check.

## Do not lock the current admin out

The old code treated one email as admin, including a hard-coded fallback when no env var was set. That fallback is gone. After this deploy, **nobody is an admin until `isAdmin` is set**.

Before you deploy the app that reads the column:

1. On the **Railway worker**, set `ADMIN_EMAIL` to the email of the account that administers Supply Pulse today (the inbox you actually sign in with). The account must already exist.
2. Deploy or restart the **worker first**. On startup it applies `prisma/sql/*.sql` listed in `src/lib/apply-sql.ts`, including `prisma/sql/20261031_user_is_admin.sql`, then sets `isAdmin = true` for `ADMIN_EMAIL` when that user exists.
3. Confirm the worker log contains `Granted isAdmin to ...` or `already has isAdmin`. If it says no user matches, register that account (or fix the env var) and restart the worker.
4. Deploy **Vercel** only after the column exists. The app selects `isAdmin` on every session refresh; a missing column breaks sign-in.
5. Remove `NEXT_PUBLIC_ADMIN_EMAIL` from Vercel and anywhere else. It is unused and used to expose the admin address to the browser. `ADMIN_EMAIL` on Vercel is optional: a Node server process will grant the same user on startup once the column exists. It does not authorize requests by itself.
6. Sign out and sign back in once (or reload until the session refreshes). The admin links appear when the session token has been rewritten from the database. Until that refresh, middleware still has the previous token and will send `/dashboard/admin` back to `/dashboard`. APIs keep using the database, so a stale token cannot grant access that `isAdmin` does not.

If the worker cannot be restarted yet, apply the column and grant from a machine that has `DATABASE_URL`:

```bash
npx prisma db execute --file prisma/sql/20261031_user_is_admin.sql --schema prisma/schema.prisma
npm run admin:grant -- you@example.com
```

`admin:grant` is idempotent. It does not create a user and does not remove admin from anyone else. To revoke, set the column false for that email (Prisma Studio or `UPDATE "User" SET "isAdmin" = false WHERE email = 'person@example.com'`). Changing `ADMIN_EMAIL` later grants an additional admin on the next worker start; it does not revoke the previous one.

The Prisma migration `prisma/migrations/20261031180000_user_is_admin` is the same `ADD COLUMN IF NOT EXISTS`, for `prisma migrate deploy` on a database that already has `User`. Do not run `prisma migrate reset` or `prisma db push --force-reset`.

## Email verification

Signup still creates a usable account after Turnstile. Blocking login on an unverified email is not part of this change: every current user would be locked out unless they were grandfathered, and the credentials provider has no verification token or message yet. A follow-up can add `emailVerified`, a hashed one-time token with an expiry, a Resend link, and a verify route. Existing rows should be marked verified in that same migration. New accounts stay unable to sign in until the link is used. Keep the duplicate-email response unchanged so registration does not reveal whether an address exists.
