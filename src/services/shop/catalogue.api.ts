import type { Category, Paginated, Pagination } from '../../types/admin';
import type { CatalogueFilters, CatalogueProduct, Offer } from '../../types/shop';
import { apiGet, apiGetPaged } from '../api';
import {
  productStatusCodec,
  toApplicablePrice,
  toCatalogueProduct,
  toCategory,
  toProduct,
  type ApiApplicablePrice,
  type ApiCategory,
  type ApiProduct,
} from '../mappers';
import { getActiveOffers } from './offers.api';

/**
 * The catalogue as one shop sees it — FR-5, FR-6.
 *
 * Endpoints: `/products`, `/categories`, `/shops/:shopId`,
 * `/price-lists/shops/:shopId/products/:productId`.
 *
 * FR-6 says each shop sees only its own applicable price. The obvious route,
 * `/price-lists/shops/:shopId/products/:productId`, answers one product per
 * call — unusable for a list page. `GET /shops/:id` already includes
 * `priceListAssociations.priceList.items`, so the shop's whole price list
 * arrives in a single request and the join happens here. That is one extra
 * call for the page, not one per row.
 */

/** The shape `GET /shops/:id` returns for the assigned price list. */
type ApiShopWithPrices = {
  id: string;
  priceListAssociations?: Array<{
    priceList?: {
      id?: string;
      name?: string;
      items?: Array<{ productId?: string; price?: string | number | null }> | null;
    } | null;
  }> | null;
};

export type ShopPriceList = {
  id?: string;
  name?: string;
  /** productId -> the price this shop pays. */
  prices: Map<string, number>;
};

const numeric = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * FR-6 — the price list assigned to this shop, as a lookup.
 *
 * An empty map is a real answer, not a failure: a shop with no list assigned
 * pays base prices, which is exactly what the server's own
 * `getApplicablePrice` falls back to.
 */
export async function getShopPriceList(shopId: string): Promise<ShopPriceList> {
  const shop = await apiGet<ApiShopWithPrices>(`/shops/${shopId}`);
  const priceList = shop.priceListAssociations?.[0]?.priceList;

  const prices = new Map<string, number>();
  (priceList?.items ?? []).forEach(item => {
    if (item?.productId) {
      prices.set(item.productId, numeric(item.price));
    }
  });

  return { id: priceList?.id, name: priceList?.name, prices };
}

/** FR-5 — the category strip. Only active categories are offered to a shop. */
export async function getShopCategories(): Promise<Category[]> {
  const page = await apiGetPaged<ApiCategory>('/categories', {
    page: 1,
    limit: 100,
  });

  return page.items.map(toCategory).filter(category => category.isActive);
}

/**
 * FR-5 + FR-6 — the orderable catalogue for one shop, priced.
 *
 * Only ACTIVE products are requested: an INACTIVE or UNAVAILABLE product is
 * rejected by `POST /orders`, so listing one would offer the shop a line it
 * cannot submit.
 *
 * Note the date gap: a product can be marked unavailable for a specific
 * delivery date (FR-5), but nothing reads those overrides back, so this list
 * cannot grey out a product that is off for tomorrow. The order call still
 * rejects it, with the server's own message. See docs/api-gaps.md G15.
 */
export async function getShopCatalogue(
  shopId: string,
  filters: CatalogueFilters,
  pagination: Pagination,
): Promise<Paginated<CatalogueProduct>> {
  const [page, priceList, offers] = await Promise.all([
    apiGetPaged<ApiProduct>('/products', {
      page: pagination.page,
      limit: pagination.limit,
      status: productStatusCodec.toApi('active'),
      ...(filters.categoryId !== 'all' ? { categoryId: filters.categoryId } : {}),
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    }),
    getShopPriceList(shopId),
    // FR-34 — the badge on a discounted product. An offers failure must not
    // take the catalogue down with it, so it degrades to "no badges".
    getActiveOffers().catch((): Offer[] => []),
  ]);

  const offersByProduct = indexOffersByProduct(offers);

  return {
    ...page,
    items: page.items.map(api => {
      const product = toProduct(api);
      return toCatalogueProduct(
        product,
        priceList.prices.get(product.id),
        offersByProduct.get(product.id) ?? offersByProduct.get(CATALOGUE_WIDE) ?? [],
      );
    }),
  };
}

/** Key for offers that name no products and therefore apply to everything. */
const CATALOGUE_WIDE = '*';

function indexOffersByProduct(offers: Offer[]): Map<string, string[]> {
  const index = new Map<string, string[]>();

  offers.forEach(offer => {
    const keys = offer.productIds.length > 0 ? offer.productIds : [CATALOGUE_WIDE];
    keys.forEach(key => {
      index.set(key, [...(index.get(key) ?? []), offer.id]);
    });
  });

  return index;
}

/**
 * FR-10 — rebuild editable cart lines from an existing server draft.
 *
 * An order item carries only `productId`, `productName`, `quantity` and
 * `unitPrice`: the order include does not join the product, so the unit, MOQ
 * and pack size the stepper needs are not on it. They are fetched per product
 * here — `GET /products` has no id-set filter, so this is one request per
 * distinct line, in parallel, and only when a draft is adopted rather than on
 * every render.
 *
 * A product that cannot be fetched still yields a line: dropping it would
 * silently shrink an order the shop already placed. It falls back to the
 * neutral MOQ and pack size of 1, and the server re-validates on save.
 */
export async function hydrateCartLines(
  shopId: string,
  items: Array<{ productId: string; name: string; unitPrice: number; quantity: number; note?: string }>,
): Promise<CatalogueLineSeed[]> {
  const [products, priceList] = await Promise.all([
    Promise.all(
      items.map(item =>
        apiGet<ApiProduct>(`/products/${item.productId}`)
          .then(toProduct)
          .catch(() => undefined),
      ),
    ),
    getShopPriceList(shopId),
  ]);

  return items.map((item, index) => {
    const product = products[index];

    return {
      productId: item.productId,
      // The order's own snapshot of the name wins: it is what the shop ordered.
      name: item.name || product?.name || item.productId,
      unit: product?.unit ?? '',
      imageUrl: product?.imageUrl,
      // The order's snapshot price wins too — re-pricing a draft behind the
      // shop's back would change a total it has already seen.
      unitPrice: item.unitPrice || priceList.prices.get(item.productId) || product?.basePrice || 0,
      quantity: item.quantity,
      moq: product?.moq ?? 1,
      packSize: product?.packSize ?? 1,
      note: item.note,
    };
  });
}

/** What `hydrateCartLines` produces: a `CartLine` in all but name. */
export type CatalogueLineSeed = {
  productId: string;
  name: string;
  unit: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  moq: number;
  packSize: number;
  note?: string;
};

/**
 * FR-6 — one product's price for this shop, straight from the server's own
 * resolution.
 *
 * Used when a single cart line needs re-pricing (a draft restored from storage
 * after a price change), where fetching the whole list would be wasteful.
 */
export async function getApplicablePrice(
  shopId: string,
  productId: string,
): Promise<{ price: number; source: 'priceList' | 'basePrice'; priceListName?: string }> {
  return toApplicablePrice(
    await apiGet<ApiApplicablePrice>(
      `/price-lists/shops/${shopId}/products/${productId}`,
    ),
  );
}
