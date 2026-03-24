# UI/UX Improvement Plan for Plus Conversion

## Progress

| Phase | Status | Date |
|-------|--------|------|
| Phase 1: Mobile Product Page CTA | ✅ Done | 2026-03-17 |
| Phase 2: Upsell Modal Clarity | ✅ Done | 2026-03-17 |
| Phase 3: TTS Paywall Softening | 🔲 Not started | — |
| Phase 4: Trial Engagement & Retention | 🔲 Not started | — |
| Phase 5: About Page Optimization | 🔲 Not started (data-dependent) | — |

### Phase 1 & 2 Changes
- Pricing card rendered above tabs on mobile via `order-first tablet:order-none`
- Sticky bottom bar enhanced with edition pills, gift/wishlist icon buttons
- Upsell modal copy clarified: concrete savings amounts, loss-framing skip button
- Skip button de-emphasized (ghost variant, smaller)
- Upsell dedup changed from once-per-session to per-book (with generic fallback)
- Note: Intercom already syncs all analytics events and can trigger automations on `start_trial`, `upsell_plus_modal_open`, etc. Phase 4.2 in-app nudge should coordinate with existing Intercom Series to avoid duplicate messaging.

---

## Context

PostHog data (90 days) reveals critical conversion gaps:
- **Mobile view→cart: 4.0%** vs Desktop 9.4% (84% of traffic is mobile)
- **Upsell modal: 92.5% skip rate** (704 shown → 51 clicked)
- **Trial→paid: 1.7%** (FB Ads) / 0% (organic) — nearly all trialists churn
- **End-to-end Plus: 0.17%** — 1,153 sign-ups → 2 paid subscribers

The upsell modal during book purchase offers three paths:
- **Yearly (no trial):** Get this book **free** + Plus subscription
- **Trial (7-day free):** Get **20% off** this book + try Plus features
- **Skip:** Buy the book at full price

---

## Phase 1: Mobile Product Page CTA (~1-2 days)

**Files to modify:**
- `pages/store/[nftClassId]/index.vue` (template restructuring)

### 1.1 Move pricing card above tabs on mobile
The pricing sidebar (line ~331) sits after all book info on mobile due to `flex-col` layout. Add responsive ordering so it renders first on mobile:
- Add `order-first tablet:order-none` to the pricing sidebar container
- Keeps desktop layout unchanged (sidebar right)

### 1.2 Enhance sticky bottom bar with edition selector
The fixed bottom bar (lines ~601-660) currently shows only price + buy button. Users must scroll up to change editions.
- Add compact edition pills/dropdown to the `<aside>` sticky bar
- Use existing `pricingItems` computed and `selectedPricingItemIndex` ref
- Reuse existing `PricingItemSelector` component or create inline pills

### 1.3 Add gift/wishlist to sticky bar
Gift + wishlist buttons (lines ~516-543) are in the sidebar, invisible on mobile. Add icon-only versions to the sticky bar.

**Verify:** Check mobile `view_item` → `add_to_cart` rate improvement over 2 weeks.

---

## Phase 2: Upsell Modal Clarity (~2-3 days)

**Files to modify:**
- `components/UpsellPlusModal.vue` (copy + layout)
- `composables/use-subscription-modal.ts` (session logic)
- `i18n/locales/en.json`, `i18n/locales/zh-Hant.json` (translations)

### 2.1 Clarify yearly value prop
Current button text "Gift this book + Plus" is confusing — "gift" implies giving to someone else.
- Change to clearly communicate: "Get this book free with yearly Plus" or similar
- Update i18n keys for both locales
- Make yearly the visually emphasized/default option since it has the strongest incentive

### 2.2 Clarify trial value prop
The 20% book discount is the main trial hook during purchase, but it's buried in button text.
- Show the discount amount explicitly: "Save $X on this book" with the actual dollar savings
- Show trial benefits list: 20% off this book, AI narration, dark mode, custom voices
- Clarify what trial doesn't include vs yearly (no free book)

### 2.3 Relax once-per-session limit
`hasShownUpsellThisSession` (line 92 of `use-subscription-modal.ts`) blocks re-triggering. Users who skip on one book never see the offer for different books.
- Change from `useSessionStorage` to track per-book: `useSessionStorage('3ook_upsell_shown_${nftClassId}')`
- Or use a cooldown (e.g., 10 minutes) instead of permanent session block

**Verify:** Check `upsell_plus_modal_open` → `subscription_button_click` (store page) rate.

---

## Phase 3: TTS Paywall Softening (~1-2 days)

**Files to modify:**
- `composables/use-text-to-speech.ts` (pre-warning logic)
- `components/TTSPlayerModal.vue` (lines ~317-342, paywall trigger)

### 3.1 Add pre-limit warning
Before the `NotSupportedError` fires, show a toast warning:
- Track segments played, show toast at N-2 before limit
- Requires understanding how the free limit is enforced (likely server-side when fetching audio)

### 3.2 Replace abrupt paywall with explainer
Current flow: audio stops → PaywallModal opens immediately (web). Change to:
- Pause audio gracefully
- Show inline message in the TTS player: "You've used your free AI narration allowance"
- Show 20% discount incentive: "Subscribe to continue + get 20% off books"
- Button: "Start free trial" / "See plans"
- Don't auto-open PaywallModal — let user choose

### 3.3 Align app and web experience
Lines 330-335 (app) vs 337-341 (web) have different behavior. Both should use the same friendly flow.

**Verify:** `tts_start` → `subscription_button_click` (reader page) rate.

---

## Phase 4: Trial Engagement & Retention (~3-5 days)

**Files to modify:**
- PostHog insights (no code)
- New component for trial onboarding nudge
- `likecoin-api-public` Stripe webhook (trial_will_end)

### 4.1 Analyze trial engagement (PostHog only, no code)
Create insight: for users with `start_trial`, count `tts_start`, `reading_session_start`, `shelf_open_book` within 7 days. Determine if trialists actually use Plus features.

### 4.2 Trial onboarding nudge
After `start_trial`, show a one-time card on shelf/account highlighting Plus features to try. Conditional on `user.isLikerPlus && likerPlus.currentType === 'trial'`.

### 4.3 Trial ending awareness
Add `customer.subscription.trial_will_end` Stripe webhook handler (in `likecoin-api-public`). Fire `trial_ending_soon` PostHog event. Display in-app banner 3 days before trial ends.

**Verify:** `start_trial` → `subscribe` rate by channel.

---

## Phase 5: About Page Optimization (~1-2 days, data-dependent)

Wait for 2+ weeks of About Page Analysis dashboard data, then:
- Reorder sections by engagement (move highest-clicked features up)
- Add trial CTA near high-engagement feature sections (especially AI narration if it leads)
- A/B test hero CTA copy

**Verify:** About Page CTA → Conversion Funnel insight.

---

## Execution Order

Ship each phase independently, measure 1-2 weeks before next:
1. **Phase 1** (mobile CTA) — highest ROI, lowest risk
2. **Phase 2** (upsell modal) — second highest impact
3. **Phase 3** (TTS paywall) — improves trial acquisition
4. **Phase 4** (trial retention) — fixes trial→paid churn
5. **Phase 5** (about page) — data-driven, last
