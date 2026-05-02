# TODO — Stems feature go-live

The paid stems flow is fully built and ready. Two things need to happen before
it works in production.

---

## 1. Create a Replicate account and get an API token

Replicate is the AI provider that runs Demucs (the model that splits a track
into drums / bass / vocals / other). Pricing: ~$0.01–0.02 per generation; we
charge $2.99, so margin is ~$2.58 net after Stripe fees.

Steps:

1. Go to https://replicate.com and sign up (GitHub login is fastest).
2. Add a payment method at https://replicate.com/account/billing.
   - You get a small free trial credit (~$0.50) without a card, but Replicate
     pauses your account once it runs out, so the card is required for prod.
3. Generate an API token at https://replicate.com/account/api-tokens.
   - It looks like `r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
   - Treat it like a Stripe secret key — anyone with this token can spend
     money on your account.

**Paste the token in chat and I'll set it on Railway** (`REPLICATE_API_TOKEN`).
That's the last blocker before the feature works.

---

## 2. (Optional) Verify the model version hash

I already set `REPLICATE_DEMUCS_VERSION` on Railway to:

```
25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953
```

This is the latest version of the `cjwbw/demucs` model on Replicate (the
htdemucs variant — 4-stem separation, MP3 output). The model hasn't shipped a
new version in ~2.5 years, so this should be stable.

To double-check: open https://replicate.com/cjwbw/demucs/versions and confirm
the top entry's hash matches the value above. If it differs, paste the new
hash and I'll update Railway.

---

## What I need from you

- [ ] Replicate API token (`r8_...`) — paste it in chat, I'll set it on Railway
- [ ] (Optional) Verify the Demucs version hash above
- [ ] Decision: keep the $2.99 generation fee or change it before launch?
      If changing, just say "make it $X" and I'll update
      `STEM_GENERATION_FEE_CENTS` in `backend/src/controllers/stemsController.ts`.

---

## What's already done (no action needed)

- ✅ Schema: added `stripeCheckoutSessionId`, `paidAmountCents`, `paidAt` to
  `TrackStems` (will land in prod via `prisma db push` on next deploy)
- ✅ Backend: new `POST /licenses/tracks/:trackId/stems/checkout` endpoint
  (direct platform charge, no Stripe Connect transfer)
- ✅ Webhook: `kind=stems_generation` → starts Replicate job after payment
- ✅ Retry path: a previously-paid generation that ends `FAILED` can be
  retried free of charge
- ✅ Frontend: button is now "Generate stems · $2.99" → Stripe Checkout →
  returns to track page → polls until ready
- ✅ Railway env: `REPLICATE_DEMUCS_VERSION` set on `makeyourmusic-api`

---

## Resolved limitation

Replicate output URLs expire quickly, so the polling handler now downloads the
four approved Replicate outputs and re-hosts them on Cloudinary before marking
`TrackStems.status = READY`. If Cloudinary is not configured or an upload fails,
the paid row becomes `FAILED` and can be retried without another charge.
