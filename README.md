# Email OTP (REQ-7)

New registrations now require a 6-digit email OTP. Configure SMTP in `backend/.env` before registering a new account. Gmail example: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=your@gmail.com`, `SMTP_PASS=your Gmail App Password`, `ALLOW_DEV_OTP_LOG=false`. OTPs expire after 10 minutes and are stored hashed. Demo seed accounts are marked as verified.

# RentEase — Review 2 Codebase

Household appliance rental platform (MERN stack). Implements **Auth & Roles**,
**Appliance Listing Management**, **Search/Filter & Booking**, and **Admin
Platform Management** from the SRS.

## Deviations from the submitted SRS (v1.0)

1. **Pricing: per day -> per month** (kept from Review 1). Rent = `ceil(days/30)` months (min 1) x `rentPricePerMonth`. Update SRS REQ-8/REQ-17 and the ER diagram to match.
2. **Booking flow restored to SRS**: bookings now start `pending` and the Owner must confirm/reject (REQ-23). The Review 1 auto-confirm shortcut is removed.
3. **Cancellation refund rules (SRS Appendix C, TBD-2) are an assumption** — see `backend/utils/bookingService.js`. Owner/Admin cancel or Owner reject = 100%; Consumer cancel >=7 days = 100%, 2–7 days = deposit + 50% rent, <2 days = deposit only. Change the numbers with your faculty's rule.
4. **Admin analytics (REQ-33)** is still users/listings only; booking/revenue metrics not added yet.

## What's implemented

| SRS Section | Requirements | Status |
|---|---|---|
| 4.1 Auth & Accounts | REQ-1 to REQ-6 | ✅ (OTP in REQ-7 not yet built) |
| 4.2 Listings | REQ-8 to REQ-12 | ✅ (Cloudinary photo upload included) |
| 4.3 Search, Filter & Booking | REQ-13 to REQ-17 | ✅ |
| 4.4 Payment & Deposit | REQ-18 to REQ-22 | ✅ Razorpay order + HMAC verify + webhook + partial refund + admin deduction (test/mock mode) |
| 4.5 Booking Lifecycle | REQ-23 to REQ-26 | ✅ confirm/reject/cancel/start/complete, history, auto-complete sweep |
| 4.6 Technician Service | REQ-27 to REQ-29 | ✅ assign, job status, Google Maps directions link |
| 4.7 Admin | REQ-30 to REQ-33 | ✅ (REQ-33 booking/revenue metrics pending) |
| 4.8 Notifications | REQ-34, REQ-35 | ✅ Nodemailer + logged placeholder + in-app Notification records. REQ-36 (Twilio OTP) pending |
| 4.9 Reviews | REQ-37 to REQ-39 | ⏳ Not started |

## Razorpay: test vs mock mode

Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (test keys) to use real Razorpay Checkout. Leave them blank and the API runs in **mock mode**: no network calls, a confirm dialog replaces the popup, but the server still performs the real HMAC-SHA256 verification and refunds are recorded the same way. `/payments/mock-checkout` is disabled whenever real keys are set.

## New API endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/payments/order`, `/verify` | Consumer |
| POST | `/api/payments/webhook` | Razorpay (HMAC-checked, raw body) |
| PATCH | `/api/bookings/:id/confirm` `/reject` `/start` | owning Owner |
| PATCH | `/api/bookings/:id/cancel` | Consumer / Owner / Admin |
| PATCH | `/api/bookings/:id/complete` | Owner / Admin |
| POST | `/api/bookings/:id/report-damage` | Owner |
| GET / PATCH | `/api/bookings/admin/disputes`, `/:id/resolve-dispute` | Admin |
| PATCH | `/api/bookings/:id/assign-technician` | Owner / Admin |
| GET | `/api/technicians` | Owner / Admin |
| GET / PATCH | `/api/technician/jobs`, `/jobs/:id/status`, `/jobs/:id/directions` | Technician |

## Tests

`backend/tests/e2e.js` runs 36 scenario checks (RBAC, overlap 409, forged-signature rejection, refunds, cancellation policy, disputes, technician flow, webhook, auto-complete). Start the API against a seeded DB with `MOCK_RAZORPAY_SECRET=testsecret PORT=5055`, then `node tests/e2e.js`.

## Stack

- **Backend:** Node.js, Express, MongoDB Atlas (Mongoose), JWT auth, bcrypt
- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios

## Project structure

```
rentease/
├── backend/
│   ├── config/db.js
│   ├── models/          User, Category, Appliance, Booking, Notification
│   ├── middleware/       auth (JWT), role (RBAC), errorHandler
│   ├── controllers/      auth, appliance, booking, category, admin, payment, technician
│   ├── routes/           auth, appliance, booking, category, admin
│   ├── seed/seed.js       demo data (admin + 2 owners + consumer + 3 listings)
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js, useCategories.js
        ├── context/AuthContext.jsx
        ├── pages/             Login, Register, Browse, ApplianceDetails, OwnerListings, OwnerBookings, MyBookings, TechnicianDashboard, AdminDashboard
        └── components/        Navbar, ApplianceCard
```

## Running locally

**Backend**
```bash
cd backend
cp .env.example .env   # fill in MONGO_URI and JWT secrets
npm install
npm run seed            # optional demo data
npm run dev              # http://localhost:5000
```

**Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Demo accounts (after seeding), all password `password123`:
- `admin@rentease.test` — Admin dashboard access
- `owner@rentease.test` — pre-approved Owner, has 3 live listings
- `pending-owner@rentease.test` — Owner awaiting approval (log in as Admin to approve/reject them)
- `consumer@rentease.test` — books appliances

## Design decisions worth noting for review

- **REQ-6 (approval gating):** Owner/Technician accounts require `isApproved = true`
  before login succeeds. There's no Admin approval UI yet (that's Checkpoint 4.7),
  so the seed script creates a pre-approved Owner for demo purposes.
- **REQ-9 (images):** Photos are uploaded through the API to Cloudinary
  (`POST /api/appliances/images`, multipart field `images`, owner-only, max 5 files,
  5 MB each, JPEG/PNG/WebP/GIF). The response is `[{ url, publicId }]`, which the
  listing form then sends with `POST /api/appliances`. The server only accepts
  `{url, publicId}` pairs that live in its own Cloudinary folder, and images removed
  from a listing via `PUT /api/appliances/:id` are deleted from Cloudinary. Without
  Cloudinary credentials the upload endpoint returns 503 and listings can still be
  created without photos (graceful degradation, SRS 5.4).
- **REQ-16 (overlap check):** Enforced at the database query level (date range
  intersection against pending/confirmed/ongoing bookings), returns HTTP 409.
- **Booking status enum** still includes the full lifecycle (`pending` →
  `confirmed`/`rejected` → `ongoing` → `completed`/`cancelled`) per the ER diagram,
  but new bookings now go straight to `confirmed` per the pricing/auto-confirm
  deviations noted above — `pending` is defined but never produced.
- **Admin approval flow**: `pending-owner@rentease.test` demonstrates REQ-6/REQ-31 —
  log in as Admin, go to the Approvals tab, and approve or reject the account.
- **Admin listing moderation**: the Admin's Listings tab shows every listing
  regardless of status and can approve a `pending_review` listing (REQ-11) or
  suspend/reinstate a live one (REQ-32).
- **Booking visibility is scoped by role, not shared.** There is no general
  "bookings dashboard" for Owner or Admin:
  - `GET /api/bookings/my-bookings` is Consumer-only (403 for other roles) —
    the "My bookings" nav link is hidden for Owner/Admin.
  - Owners see orders per-listing instead, via `GET /api/bookings/listing/:applianceId`
    on the "My listings" page ("View orders" on each listing card), which
    includes the booking Consumer's name, email, and phone.
  - Admin's Analytics tab shows user and listing counts only — no booking-level
    detail or revenue figures are surfaced to Admin.
