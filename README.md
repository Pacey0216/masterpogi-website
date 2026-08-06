# Master Pogi Website Starter

## Architecture
Two branded websites can share:
- one Google Sheet
- one inventory form
- one Apps Script API
- one stock count

This package is the Master Pogi frontend.

## Connect the inventory
1. Deploy the inventory Apps Script as a Web App.
2. Copy the `/exec` URL.
3. Open `config.js`.
4. Set:
   `apiUrl: "YOUR_EXEC_URL?store=masterpogi"`

For products to appear:
- Store must be `Master Pogi` or `Both`
- Website Visibility must be `Published`
- SKU and Product Name must not be blank

## Connect Messenger
Replace `https://m.me/YOUR_PAGE_USERNAME` in `config.js`.

## Free deployment
Use AWS Amplify, Cloudflare Pages, or GitHub Pages.
No build command is needed because this is a static HTML/CSS/JS site.

## Important
Use this storefront only for products you are legally permitted to sell.
