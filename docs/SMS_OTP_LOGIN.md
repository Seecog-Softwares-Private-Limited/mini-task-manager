# SMS OTP login (BlackSMS)

Phone OTP lets users **sign up** or **sign in** with a mobile number, and **add/verify a phone on their profile** so that number is stored on the same user account (`users.phone`).

## Product behavior

| Action | Behavior |
|--------|----------|
| **Signup via SMS** | Welcome back / Phone OTP with a new number → creates a user with `phone` set + default workspace → JWT |
| **Login via SMS** | Phone OTP with a number already on an account → JWT for that user |
| **Profile** | Signed-in user adds/changes phone → OTP verify → `users.phone` updated (unique) |
| **Email / Google** | Unchanged; phone can be added later in profile |

OTP is **not** 2FA on top of password. Codes are 6 digits, expire in **10 minutes**, single use.

Clients: **web** and **Flutter mobile** share the same API.

## End-to-end flow (storage, verify, before/after)

### Where the OTP is stored

| Store | What | When |
|-------|------|------|
| MySQL table **`otp_codes`** | `phone` (E.164), `code` (6 digits, plaintext), `expires_at` (+10 min), `id` | On every successful **send** |
| MySQL **`users.phone`** | Verified number on the account (unique, nullable) | After successful **verify** (signup or profile link) |
| BlackSMS | Delivery only — **not** the source of truth for login | During send |
| Browser / app | JWT after verify — **not** the OTP | After verify |

Before a new send for the same phone, any existing `otp_codes` row for that phone is **deleted**, then the new one is inserted.

### Before send

1. Client collects phone (country + local → E.164, e.g. `+919876543210`).
2. API validates phone format.
3. SMS must be configured (`BLACKSMS_*` in env on the API host); otherwise send fails with 400.

### Send (`POST /auth/send-otp` or `POST /auth/phone/send-otp`)

1. Normalize phone to E.164.
2. Generate 6-digit code (`100000`–`999999`).
3. **Store** in `otp_codes` (replace any prior row for that phone).
4. Call BlackSMS with 10-digit `numbers` + `variables_values` = code.
5. Return generic success (OTP **never** in the HTTP response).

### Verify (`POST /auth/verify-otp` or `POST /auth/phone/verify`)

1. Normalize phone the same way as send.
2. Look up **`otp_codes` WHERE `phone` = ? AND `code` = ?**.
3. No row → **401** (wrong code, never sent, or already used).
4. Past `expires_at` → delete row → **401** expired.
5. OK → **delete** that OTP row (one-time use).
6. Then:
   - **Public verify-otp:** find user by `phone` → login; or create user + workspace → signup; issue JWT.
   - **Profile phone/verify:** set `users.phone` on the signed-in user; issue JWT.

### After verify

| Outcome | What changed |
|---------|----------------|
| Login | Existing user; JWT; OTP row gone |
| Signup | New `users` row with `phone`; default workspace; JWT; OTP row gone |
| Profile link | `users.phone` updated; OTP row gone; number usable for later Phone OTP login |

**Phone↔OTP binding:** only OpsPick DB (match on both fields). BlackSMS does not verify.

## Provider: BlackSMS

Primary SMS gateway for India (~₹0.30/OTP). Twilio remains an optional fallback via env.

1. Register / KYC at [blacksms.in](https://blacksms.in/register)
2. Copy **API key** and **Sender ID** (dashboard account id is used as `sender_id` in their Node example)
3. Recharge wallet before live tests (~₹0.30/SMS)
4. Set env on the API host (never commit secrets; **rotate the key if it was pasted in chat**):

```bash
SMS_PROVIDER=blacksms
BLACKSMS_API_KEY=...
BLACKSMS_SENDER_ID=...
BLACKSMS_ROUTE=1
BLACKSMS_SMS_URL=https://blacksms.in/sms
```

Request matches their Node sample (`route` as string `"1"`, 10-digit `numbers`). Success:

```json
{ "return": true, "request_id": "req_…", "message": ["SMS sent successfully"] }
```

Optional Twilio fallback:

```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

Restart the API after changing env.

## API

### Public (signup / login)

- `POST /auth/send-otp` `{ "phone": "+919876543210" }` → `{ "message": "..." }`
- `POST /auth/verify-otp` `{ "phone": "+919876543210", "code": "123456" }` → login response (JWT + user)

Unknown phone on verify → **signup** (new account with that phone).  
Known phone → **login**.

### Authenticated (profile link)

- `POST /auth/phone/send-otp` `{ "phone": "+919876543210" }` (Bearer token)
- `POST /auth/phone/verify` `{ "phone": "+919876543210", "code": "123456" }` → JWT + user with updated phone

Fails if the number belongs to another account.

### Profile read

- `GET /users/me` includes `phone` (nullable)

## Phone normalization

- Client should send E.164 (e.g. `+919876543210` from country picker).
- Bare 10-digit numbers are treated as **India (+91)**.
- BlackSMS is called with the **10-digit** local number; DB stores E.164.

## Security

- Auth rate limiter applies to OTP routes (per IP when public; per user when authenticated). See [RATE-LIMITING.md](./RATE-LIMITING.md).
- OTP never returned in API responses.
- When SMS is not configured, send fails with “SMS service is not configured…” (code may appear in **server logs** only for ops debugging).
- Keep API keys in env only; rotate if exposed.

## Privacy

Do **not** put real user phone numbers from chats/screenshots into docs, examples, or commits. Use placeholders: `+919876543210`.

## Smoke tests

1. Set BlackSMS env → restart API.
2. **Web:** Login → Phone OTP → send code → verify → dashboard (signup or login).
3. **Web:** Profile → add/change phone → verify → logout → Phone OTP login → same account.
4. **Mobile:** Login → Phone OTP tab → same as web.
5. **Mobile:** My Profile → Add/Change phone → verify → logout → Phone OTP login.
6. Confirm `users.phone` in DB matches E.164.

## Your next steps (ops)

```bash
SMS_PROVIDER=blacksms
BLACKSMS_API_KEY=...
BLACKSMS_SENDER_ID=...
BLACKSMS_ROUTE=1
BLACKSMS_SMS_URL=https://blacksms.in/sms
BLACKSMS_SMS_URL=https://blacksms.in/sms
```

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| “SMS service is not configured” | Missing `BLACKSMS_API_KEY` / `BLACKSMS_SENDER_ID` or API not restarted |
| OTP never arrives | Low wallet balance, wrong sender ID, KYC/route not active |
| Invalid phone | Not E.164 / wrong country digits |
| Phone already linked | Number belongs to another user |

## Related

- Frontend auth strategy: [FRONTEND-AUTH-STRATEGY.md](./FRONTEND-AUTH-STRATEGY.md)
- BlackSMS docs: https://blacksms.in/docs
