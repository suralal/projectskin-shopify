# Project Skin Shopify Theme

A clean-room Shopify Online Store 2.0 implementation of the Purity-inspired
storefront built in this workspace. It includes the complete homepage sequence,
Shopify-native commerce behavior, merchant-editable sections, and the project
media supplied with the Next.js application.

No proprietary NextSky Liquid, JavaScript, CSS, or Shopify theme source is
included.

## First Release Navigation

The first release intentionally focuses the primary navigation on three paths:

- **Shop** — `/collections/all`, with product image transitions, a direct
  `View details` hover action, quick add, and complete Shopify product pages.
- **The Science** — `/pages/the-science`, with an editable Digital Twin,
  recommendation engine, routine tracker, and progress-review experience.
- **Consultation** — `/pages/consultation`, with an editable dermatologist hero,
  process explanation, and Shopify-native appointment request form.

Shopify theme files cannot create store Page records. Create these two records
once in **Shopify Admin > Online Store > Pages**:

1. Create **The Science**, set the handle to `the-science`, and assign the
   `page.the-science` theme template.
2. Create **Consultation**, set the handle to `consultation`, and assign the
   `page.consultation` theme template.

After that assignment, the header and all cross-page links work in both local
Theme Dev and the published storefront. The page content remains editable in
the Shopify Theme Editor.

## Included

- 19-section Purity homepage in templates/index.json
- Three-slide hero with autoplay, swipe, arrows, and editor block selection
- Seamless benefit and brand marquees
- Collection-backed product tabs and shade finder
- Collection showcase with editorial media and animated hover states
- Sticky scroll-scatter philosophy section with reduced-motion fallback
- Interactive routine quiz
- Viewport-aware video results and horizontal review rails
- Product result, deal, routine builder, ingredients, FAQ, and Instagram sections
- Smart sticky header, dropdown/mega menus, mobile navigation, predictive search,
  browser wishlist, AJAX cart drawer, quick shop, and product media lightbox
- White reference-style footer with service benefits, menus, contact, newsletter,
  localization, payment icons, and back-to-top
- Product, collection, list collections, search, cart, page, FAQ, contact, blog,
  article, and 404 templates
- Populated product information blocks, app block support, native variants,
  inventory, dynamic checkout option, sticky add to cart, related products, and
  product metafield ingredients
- Responsive images, LCP priority handling, reduced motion, keyboard focus states,
  and Shopify Theme Editor block support

## Shopflo checkout

This theme integrates [Shopflo](https://www.shopflo.com/) the same way as the live
Project Skin storefront:

1. Loads `https://bridge.shopflo.com/js/shopflo.bundle.js` from `snippets/shopflo.liquid`
2. Routes **Checkout** (cart drawer + cart page) through `handleFloCheckoutBtn()`
3. Routes **Buy it now** through `handleFloBuyNowBtn()` (`#flo-buy-now-button`)
4. Optionally opens **Flo Cart** from the bag icon via `handleFloCartBtn()`

Theme settings → **Shopflo**:

- **Enable Shopflo checkout** — master switch (on by default)
- **Use Flo Cart for bag icon** — opens Flo Cart instead of the theme drawer

Shopflo must already be connected on the Shopify store (custom app / Operator).
Theme code alone cannot create that connection.

On local Theme Dev (`127.0.0.1`), Shopflo's health check normally sees
`shop-url=127.0.0.1:9293` and disables Flo. This theme rewrites those requests to
`theprojectskin.com` so Flo Cart / Checkout work in Theme Dev too.

Expected flow (matches live Project Skin):

1. Add to cart / bag icon → Flo Cart drawer ("Powered by shopflo")
2. Checkout in that drawer → `checkout.shopflo.co` payments UI

## Install

1. In Shopify Admin, open **Online Store > Themes**.
2. Select **Add theme > Upload zip file**.
3. Upload purity-inspired-theme-v1.0.zip.
4. Open the Theme Editor and connect the menus, collections, products, and social
   URLs described below.

For Shopify CLI:

~~~sh
shopify theme dev --store your-store.myshopify.com --path shopify-theme
~~~

## First Store Setup

1. Assign the main menu to the Header. Nested menu levels automatically become
   dropdown or mega-menu columns.
2. Connect collections to the Popular Picks tabs, shade tabs, routine steps, and
   related-product areas.
3. Replace the built-in project media with store-owned images where desired.
4. Assign two navigation menus to the footer blocks.
5. Configure suggested search products, cart recommendations, and empty-cart
   products in Theme settings.
6. Add social URLs, customer accounts, localization markets, and payment methods
   in Shopify Admin.
7. Create the optional product metafields in METAFIELDS.md.
8. Assign the page.contact and page.faq templates to the relevant pages.

## Product Data

Shopify Admin is the source of truth for every product page. Edit a product under
**Products**, then refresh the storefront; the shared product template reads the
title, price, availability, description, variants, and every item in the
product's **Media** list automatically. Images and videos appear in the same
order used in Admin, with thumbnail, arrow, swipe, keyboard, zoom, and
variant-linked media behavior.

Product cards, search results, collection pages, recommendations, and header
promotions link to Shopify's canonical `product.url`, so merchants do not need
to maintain separate theme URLs or duplicate product content in the Theme
Editor.

## Validation

Run:

~~~sh
shopify theme check --path shopify-theme
node --check shopify-theme/assets/theme.js
node --check shopify-theme/assets/purity-home.js
~~~

The first-release theme passes Shopify Theme Check with zero offenses.

Visual QA requires a connected Shopify development store because Shopify Liquid
products, collections, routes, forms, localization, and predictive search cannot
be rendered faithfully as a standalone HTML site.
