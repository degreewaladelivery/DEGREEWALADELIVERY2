# Image assets — where to drop your photos

The site shows tasteful **emoji tiles** until you add real images here.
Drop a correctly-named file in the right folder and it appears automatically
(no code change, no restart needed beyond the dev server's hot-reload).

Supported formats: **.jpg .jpeg .png .webp** (brand art may also be **.svg**).

---

## 1. Category photos → `categories/`
Name the file after the **category key**:

| File to add | Used for |
|---|---|
| `categories/food.jpg` | Food |
| `categories/grocery.jpg` | Grocery |
| `categories/medical.jpg` | Medical |
| `categories/bakery.jpg` | Bakery |
| `categories/meat.jpg` | Meat |
| `categories/stationery.jpg` | Stationery |
| `categories/electronics.jpg` | Electronics |
| `categories/fuel.jpg` | Fuel |
| `categories/homestays.jpg` | Homestays |

Recommended size: ~400×300 (landscape).

## 2. Shop photos → `shops/`
Name the file after the **shop id** (see `shared/mockData.ts`), e.g.:

| File to add | Used for |
|---|---|
| `shops/shop-parijata.jpg` | Parijata |
| `shops/shop-biryani-point.jpg` | Biryani Point |
| `shops/shop-grocery-mart.jpg` | Grocery Mart |
| … | … |

Recommended size: ~600×400 (landscape).

## 3. Brand art → `brand/`
| File to add | Used for |
|---|---|
| `brand/hero.png` | The big hero illustration (delivery scooter etc.) |
| `brand/app-phone.png` | The phone mockup in the "Get the App" section |
| `brand/logo.png` | (optional) header logo, replaces the emoji mark |

Hero recommended size: ~800×800 (square-ish) or larger.
