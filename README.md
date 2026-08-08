# Master Pogi storefront

## Current setup
- Uses the shared `Top Watch 102 + Master Pogi Inventory` Google Sheet.
- The storefront is prepared for the shared Apps Script inventory API.
- Sample inventory is disabled.
- Only products with stock greater than 0 are intended to appear.
- `Website Visibility = No` hides a product even when stock exists.

## Shared inventory
The live catalog source is the `Products` tab:

https://docs.google.com/spreadsheets/d/1ljK2RqkdA8E3iEpEutrhMnTurxGqXwY6Kb8yF2hW3S8/edit?gid=1807963011#gid=1807963011

Both Master Pogi and Top Watch 102 use the same stock pool.

## Shared Apps Script API
The backend source is in:

- `apps-script/Code.gs`
- `apps-script/README.md`

Deploy that script once as a Google Apps Script Web App and use the same `/exec` URL in both storefronts.

## Remaining deployment step
After the Apps Script Web App is deployed, paste its `/exec` URL into `apiUrl` in:

- `Pacey0216/masterpogi-website/config.js`
- `Pacey0216/topwatch/config.js`

No GitHub update is needed when stock changes after that. Each storefront fetches current inventory on page load.
