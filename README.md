# Master Pogi simplified storefront

## Included design decisions
- Search is visible immediately in the hero section.
- Only one header action: Message Us.
- Top-selling products appear before the full catalog.
- Product cards stay simple.
- Product details open in a premium full product profile.
- A floating Message Us button stays visible on mobile.
- Google Sheet/API integration is intentionally disabled for design review.

## Current mode
The site uses sample unbranded products from `data.js`.

## Later connection
The shared sheet reference is already stored in `config.js`, but the website still needs a deployed Apps Script `/exec` endpoint.

When ready:
1. Deploy the Apps Script inventory API.
2. Edit `config.js`.
3. Paste the URL into `apiUrl`.
4. Set `sampleMode` to false if desired.
5. Replace the Messenger placeholder.

Shared sheet:
https://docs.google.com/spreadsheets/d/1ljK2RqkdA8E3iEpEutrhMnTurxGqXwY6Kb8yF2hW3S8/edit?gid=537048309#gid=537048309

Use this storefront only for products you are legally permitted to sell.
