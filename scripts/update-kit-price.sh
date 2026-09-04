#!/usr/bin/env bash
set -euo pipefail

STORE="${SHOPIFY_STORE:-q9wi15-80.myshopify.com}"
PRODUCT_ID="${KIT_PRODUCT_ID:-15501581615475}"
VARIANT_ID="${KIT_VARIANT_ID:-63979048305011}"
PRICE="${KIT_PRICE:-1899.00}"

echo "Updating kit variant ${VARIANT_ID} to ₹${PRICE} on ${STORE}..."

if ! shopify store execute -s "${STORE}" -q 'query { shop { name } }' --json >/dev/null 2>&1; then
  echo "No stored auth. Run once:"
  echo "  shopify store auth --store ${STORE} --scopes write_products"
  exit 1
fi

shopify store execute -s "${STORE}" --allow-mutations \
  -q 'mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id price } userErrors { field message } } }' \
  -v "{\"productId\":\"gid://shopify/Product/${PRODUCT_ID}\",\"variants\":[{\"id\":\"gid://shopify/ProductVariant/${VARIANT_ID}\",\"price\":\"${PRICE}\"}]}" \
  --json

echo "Done. Hard-refresh the storefront to verify."
