# TikTok Mini Games Readiness

Source checked against the Mini Games development-stage guidance:
https://developers.tiktok.com/doc/mini-games-development-stage

## Ready in this prototype

- Mobile portrait game experience.
- No `eval`, `new Function`, `document.write`, `navigator.clipboard`, `navigator.share`, or direct `location` usage.
- Privacy and Terms links point to `appalachiaoffroadapp.com`.
- Trusted domain added in TikTok Developer Portal: `https://appalachiaoffroadapp.com`.
- TikTok client key added to `minigame.config.json`.
- TikTok SDK script and `TTMinis.game.init(...)` are injected at the top of `index.html`.
- TikTok CLI setup completed with English language preference.
- TikTok CLI build completed and produced `appalachia-trail-runner.zip`.
- TikTok CLI generated `minis.manifest.json`.
- Rewarded ad placements are isolated behind `showRewardedAd(...)`.
- Share action is isolated behind `TrailRunnerShareSDK` / `TikTokGameSDK`.
- Hosted HTTPS path is prepared in the Appalachia Offroad app:
  - `/trail-runner`
  - `/trail-runner-game/index.html`

## Still required before TikTok review

- Confirm the Mini Game is created/registered in TikTok Developer Portal.
- Login to TikTok's CLI with the Developer Platform account.
- Upload the package using TikTok's CLI after login.
- Replace placeholder rewarded-ad timer with TikTok rewarded ad callbacks.
- Replace placeholder share behavior with the approved TikTok share API.
- Add approved game icons, screenshots, description, category, and age/content rating.
- Confirm all external domains are declared/allowed in TikTok configuration.
- Submit the built package through TikTok's review flow.
