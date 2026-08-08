# Shared Inventory API deployment

This one Apps Script web app is the read-only catalog feed for both storefronts:

- Master Pogi
- Top Watch 102

It reads the private Google Sheet `Top Watch 102 + Master Pogi Inventory` and returns only public catalog fields from `Products` plus an aggregated sale count from `Transactions`.

It does **not** expose Clients, customer details, unit costs, profit, or raw transaction records.

## Deploy

1. Open the inventory Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Open `Code.gs`.
4. Replace the contents with the code from `apps-script/Code.gs` in this repository.
5. Click **Save**.
6. Click **Deploy → New deployment**.
7. Choose **Web app**.
8. Execute as: **Me**.
9. Who has access: **Anyone**.
10. Click **Deploy** and authorize the script when prompted.
11. Copy the URL ending in `/exec`.

## Connect both websites

Paste the same `/exec` URL into `apiUrl` in both repositories:

- `Pacey0216/masterpogi-website/config.js`
- `Pacey0216/topwatch/config.js`

Do not use the `/dev` testing URL.

## Catalog rules

The API publishes a product only when:

- `Product Name` is present;
- `Total Stock` is greater than 0; and
- `Website Visibility` is not `No`, `Hidden`, `Hide`, `False`, or `0`.

A blank `Website Visibility` is treated as visible.

The two websites intentionally use the same stock pool. The `store` query parameter is accepted by the storefront URLs but is not used to split inventory.

## Automatic updates

No GitHub update is required when inventory changes. Each page load fetches the API with `cache: no-store`, so current stock, prices, images, grades, sizes, and descriptions are read from the Sheet.

When a sale makes `Total Stock` zero, the product disappears from both storefronts automatically.
