# 🛍️ NUShop

> A specialized e-commerce platform built specifically for NUS students and campus merchants setting up physical booths or selling items around campus.  
> Developed as part of the **NUS Orbital Programme** at the **Apollo 11** level.

[![Live Demo](https://img.shields.io/badge/Demo-nushop--dusky.vercel.app-brightgreen)](https://nushop-dusky.vercel.app)
[![Extended ReadMe / Report](https://img.shields.io/badge/Documentation-Google%20Doc-blue)](https://docs.google.com/document/d/1i_aN_R50m9WxeioYb7ps4PHqel8dD_b_NyIXqX_v8bw/edit?usp=sharing)

---

## 👥 Authors & Mentorship
- **Developers:** Austin Chia & Kong Qi Yuan
- **Advisor:** Eugene
- **Achievement Level:** Apollo 11

---

## 📌 Quick Links & Demo Credentials
- **Live Deployment:** [nushop-dusky.vercel.app](https://nushop-dusky.vercel.app) *(Recommended browser: Google Chrome)*
- **Stripe Test Payment Card:** `4242 4242 4242 4242` (Expiry: any future date, CVC: any 3 digits)
- **Multi-user Testing (Live Chat):** Open two separate browser instances or incognito windows to test buyer & seller interactions.
- **Account Verification:** Due to NUS firewalls blocking external SMTP verification emails to `@u.nus.edu`, please sign up using a standard personal email (e.g. Gmail).

---

## 💡 Motivation & Aim
Merchants and student groups frequently set up temporary booths around campus (e.g., Central Library), but students often miss purchasing opportunities when rushing to classes. Pre-existing channels (Carousell, Univus, Telegram channels) are either unorganized, lack dedicated marketplace features, or are not tailored to NUS.

**NUShop** bridges physical campus commerce with an online experience:
- Promotes physical booth locations alongside full online purchasing.
- Centralizes campus merchandise discovery with structured categories and fast search.
- Enables safe, authenticated interactions and transactions between buyers and sellers.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, TypeScript, Tailwind CSS, shadcn/ui, Zustand, `react-use-websocket` |
| **Backend** | Go (Golang), Gin Web Framework, `gorilla/websocket` |
| **Database** | PostgreSQL (Docker locally, Render in production), `golang-migrate` |
| **Media & Storage**| Cloudinary (with automatic JPEG 85% / PNG lossless compression) |
| **Payments** | Stripe Checkout & Webhooks (PCI DSS Compliant) |
| **Email / Auth** | Go `net/smtp` (Gmail SMTP), Google OAuth 2.0 |
| **Hosting** | Vercel (Frontend & Serverless Go backend), Render (PostgreSQL) |

### System Data Flow
1. **REST API:** Standard CRUD operations over HTTPS.
2. **WebSockets:** Real-time push communication for live chat messaging and throttled read receipts.
3. **Cloudinary Pipeline:** Uploads & deletions route via the Go backend to enforce authorization and protect API credentials, while the client fetches/renders images directly from Cloudinary CDN.
4. **Database Access:** The Go backend is the sole authority communicating with PostgreSQL.

---

## ✨ Key Features

### 1. Listing Management (CRUD)
- Multi-part forms for creating/editing listings (title, price, quantity, condition, category, multi-image upload).
- Reusable `ListingGallery` across Home, Manage Listings, and Profile pages.
- Automated cleanup: deleting a listing triggers cleanup of linked images in Cloudinary to avoid orphan files.

### 2. Shopping Cart
- Real-time subtotal/total calculations with instantaneous optimistic UI updates.
- Upsert logic for adding and adjusting item quantities.

### 3. Authentication & Security
- **Dual-Token JWT Architecture:**
  - Short-lived Access Token (15 min) in `Authorization: Bearer` header.
  - Long-lived Refresh Token (7 days) stored in `HttpOnly`, `SameSite`, `Secure` cookie.
  - Refresh token rotation & database-tracked revocation on logout.
- **MFA & Account Verification:**
  - 6-digit one-time email verification codes (10-minute expiry via SMTP).
  - Google OAuth 2.0 integration with mandatory custom username selection.
  - Server-side one-way password hashing.

### 4. Advanced Search, Filtering & Pagination
- **Three-Tier Search Strategy:**
  1. *Full-Text Search:* PostgreSQL `tsvector` + GIN indexing with weighted ranking ($Title > Description > Category$).
  2. *Trigram Search:* PostgreSQL `pg_trgm` extension with `word_similarity()` to handle typos and partial matches.
  3. *Default Fallback Query:* Composite ranking algorithm.
- **Cursor-based Pagination:** Uses composite cursor `(score, id)` to prevent duplicate or missing records across updates.

### 5. Real-Time Chat & Read Receipts
- Full-duplex WebSocket connection with ping/pong heartbeat and exponential backoff auto-reconnect.
- **Shared Connection:** UI components share a single WebSocket connection across the chat view.
- **Read Receipts:** Tracked with `IntersectionObserver` when messages scroll into viewport, throttled to 500ms via `lodash.throttle`.

### 6. Notifications & Alerts
- In-browser badges for cart updates, price drops, and unread chats.
- Automated SMTP emails for account activation, password changes, and Stripe payment receipts.

### 7. Secure Payments (Stripe)
- Delegated payment processing via Stripe Checkout (zero card data stored on servers).
- Server-side price validation directly against PostgreSQL before session creation.
- Asynchronous webhook confirmation (`checkout.session.completed`) before clearing cart and finalizing orders.

### 8. Recommendation Engine
- **Non-Personalized:** Balanced weighted scoring combining:
  $$\text{Score} = w_1 \cdot \text{Recency} + w_2 \cdot \text{Popularity} + w_3 \cdot \text{Randomness}$$
  *(Popularity decayed using 7-day half-life decay function, precomputed via daily `pg_cron` materialized view).*
- **Personalized:** Incorporates user interaction history (views, searches, purchases) for custom home page feeds.

---

## ⚠️ Known Browser & Environment Limitations
- **Safari Third-Party Cookies:** Due to Safari ITP restrictions on cross-domain cookies between Vercel and Render, Google Chrome is recommended.
- **NUS Email Blocking:** NUS mail servers reject automated verification emails sent via external SMTP; use a personal email (e.g. Gmail) for testing registration.
- **Single Session per Browser:** Cookie scoping limits one active session per browser; use separate incognito windows to test live chat between buyer and seller.
