---
status: partial
phase: 04-visitor-profiles-offers
source: [04-VERIFICATION.md]
started: 2026-05-10T21:54:00Z
updated: 2026-05-10T21:54:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Public gallery access without account
expected: Gallery page and artwork detail pages load normally with no cookies set. No redirect to login or any auth gate.
result: [pending]

### 2. Real-time below-floor warning
expected: On the offer form for an artwork with a base price, typing an amount below the base price shows an orange warning block live (without submitting). The submit button remains enabled — warning does not block submission.
result: [pending]

### 3. Artist email notification via Resend
expected: After configuring RESEND_API_KEY in .env.local and submitting an offer as a visitor, an email arrives at the ARTIST_EMAIL inbox within seconds. Email contains artwork title, visitor name, phone number, and offer amount.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
