# Project Skin analytics setup

The theme supports one analytics provider at a time. Keeping a single owner for GA4 prevents duplicate page views, cart events, and purchases.

## Recommended: Shopify Google & YouTube app

1. In Shopify Admin, install or open **Google & YouTube**.
2. Connect the correct Google account and GA4 web stream.
3. In **Online Store > Themes > Customize > Theme settings > Analytics & tracking**, keep **Tracking provider** set to **Shopify Google & YouTube app**.
4. Leave the GA4 and GTM fields blank.
5. Test the storefront with Google Analytics DebugView and Shopify Pixel Helper.

This is the preferred production setup because Shopify can measure the complete checkout journey, including purchase events that happen outside the theme.

## Advanced: GTM custom pixel

Use this only when the Google & YouTube app does not meet the tracking requirements.

1. Keep the theme provider set to **Shopify Google & YouTube app** so the theme does not load a second Google tag.
2. In Shopify Admin, go to **Settings > Customer events**.
3. Add a custom pixel named **Project Skin GTM**.
4. Paste the contents of `docs/project-skin-gtm-custom-pixel.js`.
5. Replace `GTM-XXXXXXX` with the production GTM container ID.
6. Connect and test the pixel with Shopify Pixel Helper.
7. In GTM, map the pushed event names to GA4 event tags.

Do not run the Google & YouTube GA4 connection and a GTM-managed GA4 configuration at the same time unless GTM is explicitly configured not to resend Shopify ecommerce events.

## Direct GA4 fallback

Direct GA4 mode is useful for a staging storefront or a store that cannot install the Google channel. It measures storefront behavior but cannot guarantee checkout completion or purchase tracking.

1. Select **Direct Google Analytics 4** in the theme analytics settings.
2. Enter the `G-` measurement ID.
3. Enable debug mode temporarily and confirm events in GA4 DebugView.
4. Disable debug mode before launch.

## Events

The storefront integration supports:

- `page_view`
- `view_item_list`
- `select_item`
- `view_item`
- `view_cart`
- `add_to_cart`
- `remove_from_cart`
- `begin_checkout`
- `search` and `view_search_results`
- `login` and `sign_up`
- `generate_lead`

The custom pixel adds checkout-safe events:

- `add_shipping_info`
- `add_payment_info`
- `purchase`

No email address, phone number, street address, or customer name is sent by the supplied implementation.
