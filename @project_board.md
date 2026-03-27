# 📍 CURRENT MICRO-STATE: dvh-Fallback für iOS < 15.4 implementiert. Warten auf QA durch Gem 4.

## Aufgaben:
- ✅ Alle iOS-Hotfix-Branches in main gemergt (569f127)
- ✅ Checkout Scaffold (feature/checkout-logic ce7ba89)
- ✅ V3 Hardening: -webkit-fill-available in @supports (-webkit-touch-callout), env() → 0px (hotfix/ios-safari-v3-hardening)
- ✅ Viewport Fallback < 15.4: `100vh` vor globalen `dvh`/`svh` Units (fix/ios-viewport-fallback)
- 🔲 DB-Migration: `payment_intent_id` zu `orders`
- 🔲 Stripe Checkout Elements UI
