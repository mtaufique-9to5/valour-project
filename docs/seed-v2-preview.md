# seed-v2 preview (generated from the seed plan; NOT executed)

Source: src/data/catalog.js via buildSeedPlanV2(). Prices only from CONFIRMED_PRICES (getUnitPrice). Re-running skips rows that already exist (matched by name / key / part+option_key / SKU+slug); nothing is updated or deleted. No admin_* or audit row is changed except one catalog.seed audit entry.

## Website role (1)

| name |
|---|
| Customer |

## Setting (1)

| key | type | value | is_public |
|---|---|---|---|
| store_currency | currency | USD | true |

## Products (12) — all draft, track_stock FALSE, stock 0, no sale price, no category/brand

| SKU | slug | name | type | base_price | main_image | gallery |
|---|---|---|---|---|---|---|
| LUC-01 | sunseeker-yellow | Sunseeker Yellow | watch | 525.00 | /images/sunseeker-yellow/img-1.jpeg | 8 |
| LUC-06 | astral-blue | Astral Blue | watch | 525.00 | /images/astral-blue/2.jpeg | 8 |
| LUC-05 | aurora-mint | Aurora Mint | watch | 525.00 | /images/aurora-mint/1.jpeg | 8 |
| LUC-02 | nova-red | Nova Red | watch | 525.00 | /images/nova-red/1.jpeg | 8 |
| LUC-03 | frost-silver | Frost Silver | watch | 525.00 | /images/frost-silver/1.jpeg | 8 |
| LUC-04 | eclipse-black | Eclipse Black | watch | 525.00 | /images/eclipse-black/1.jpeg | 8 |
| P-1 | black | Black Strap | strap | 45.00 | /images/strap-1.png | 0 |
| P-2 | blue | Blue Strap | strap | 45.00 | /images/strap-2.png | 0 |
| P-3 | yellow | Yellow Strap | strap | 45.00 | /images/strap-3.png | 0 |
| P-4 | silver | Silver Strap | strap | 45.00 | /images/strap-4.png | 0 |
| P-5 | red | Red Strap | strap | 45.00 | /images/strap-5.png | 0 |
| P-6 | grey | Grey Strap | strap | 45.00 | /images/strap-6.png | 0 |

additional_info keeps only fields already in catalog.js: subtitle, collection, movement, material, color, tagline, limited, accent, pdpSubtitle, specs, editions.

## Customizer options (26) — all active

| part | option_key | name | image | sort | default |
|---|---|---|---|---|---|
| case | black | Black | /images/customizer/case/case-black.png | 0 | yes |
| case | gold | Gold | /images/customizer/case/case-dold.png | 1 |  |
| case | silver | Silver | /images/customizer/case/case-silver.png | 2 |  |
| dial | black | Black | /images/customizer/dial/dial-black.png | 0 | yes |
| dial | light-blue | Light Blue | /images/customizer/dial/diallightblue.png | 1 |  |
| dial | mint | Mint | /images/customizer/dial/dial-mint.png | 2 |  |
| dial | navy-blue | Navy Blue | /images/customizer/dial/dial-navy-blue.png | 3 |  |
| dial | orange | Orange | /images/customizer/dial/dial-orange.png | 4 |  |
| dial | purple | Purple | /images/customizer/dial/dial-purple.png | 5 |  |
| dial | red | Red | /images/customizer/dial/dial-red.png | 6 |  |
| dial | silver | Silver | /images/customizer/dial/dial-silver.png | 7 |  |
| dial | teal | Teal | /images/customizer/dial/dial-teal.png | 8 |  |
| dial | yellow | Yellow | /images/customizer/dial/dial-yellow.png | 9 |  |
| strap | black-black | Black | /images/customizer/straps/strap_black_black.png | 0 | yes |
| strap | black-grey | Black Grey | /images/customizer/straps/strap_black_grey.png | 1 |  |
| strap | black-silver | Black Silver | /images/customizer/straps/strap_black_silver.png | 2 |  |
| strap | grey-black | Grey Black | /images/customizer/straps/strap_grey_black.png | 3 |  |
| strap | grey-blue | Grey Blue | /images/customizer/straps/strap_grey_blue.png | 4 |  |
| strap | grey-grey | Grey | /images/customizer/straps/strap_grey_grey.png | 5 |  |
| strap | grey-light-blue | Light Blue | /images/customizer/straps/strap_grey_light_blue.png | 6 |  |
| strap | grey-orange | Grey Orange | /images/customizer/straps/strap_grey_orange.png | 7 |  |
| strap | grey-purple | Grey Purple | /images/customizer/straps/strap_grey_purple.png | 8 |  |
| strap | grey-red | Grey Red | /images/customizer/straps/strap_grey_red.png | 9 |  |
| strap | grey-silver | Grey Silver | /images/customizer/straps/strap_grey_silver.png | 10 |  |
| strap | grey-teal | Grey Teal | /images/customizer/straps/strap_grey_Teal.png | 11 |  |
| strap | grey-yellow | Grey Yellow | /images/customizer/straps/strap_grey_yellow.png | 12 |  |

## Not created

- custom-watch: no confirmed price
