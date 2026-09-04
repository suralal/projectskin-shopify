# Optional Shopify Data Contracts

The theme works without these definitions by using editable section blocks.
Create them to manage reusable product content from Shopify Admin.

## Product Metafields

### Ingredient or Info Gallery

- Namespace and key: custom.info_gallery
- Recommended type: List of metaobject references
- Used by: **Purity ingredients**
- Theme setting: Info gallery metafield

Recommended metaobject fields:

| Key | Type | Purpose |
| --- | --- | --- |
| heading | Single line text | Ingredient or feature name |
| title | Single line text | Optional fallback name |
| description | Multi-line text | Supporting copy |
| image | File | Card image |

### Product Badge

- Namespace and key: custom.badge
- Recommended type: Single line text
- Global setting: Custom badge metafield

### Short Description

- Namespace and key: custom.short_description
- Recommended type: Rich text
- Purpose: Concise product copy above detailed accordions

### Highlights

- Namespace and key: custom.highlights
- Recommended type: List of metaobject references
- Suggested fields: heading, description, icon, image

### Key Features

- Namespace and key: custom.key_features
- Recommended type: List of metaobject references
- Suggested fields: heading, description, icon

### Complete the Look

- Namespace and key: custom.complete_the_look
- Recommended type: List of product references

## Shopify-Native Sources

- Related products can use a manually selected collection or the current
  product's first collection.
- Cart recommendations use the collection selected in **Theme settings > Cart**.
- Search suggestions use the collection selected in **Theme settings > Search**.
- Product ratings and subscriptions can be supplied through an app block in the
  Product information section.
- Collection filtering uses Shopify Search & Discovery filters.

## Migration Notes

- Namespace/key fields are intentionally configurable where the section reads
  metaobjects. Stores can use a different namespace without editing Liquid.
- Keep image fields as Shopify files so image_url and responsive CDN transforms
  remain available.
- Manual section blocks remain the fallback and are useful for editorial content
  that should not be tied to one product.
