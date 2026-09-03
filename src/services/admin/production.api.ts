import type {
  ExportFormat,
  ProductionDetail,
  ProductionLine,
  ProductionRequirement,
} from '../../types/admin';
import { addDays } from '../../utils/format';
import { apiGet } from '../api';
import { NotImplementedOnServer } from '../mappers';
import { getGlobalCutoffTime } from './cutoff.api';
import { countActiveShops } from './shops.api';

/**
 * Production plans — FR-37.
 *
 * Endpoints: `/production-plans/date/:date`, `/production-plans/generate`.
 */

/**
 * A plan does not exist until `POST /production-plans/generate` has run for
 * that date; the read then 404s. This is a normal state rather than a failure,
 * so it is a distinct error the screen can answer with a "Generate" action.
 */
export class ProductionPlanNotGenerated extends Error {
  readonly deliveryDate: string;

  constructor(deliveryDate: string) {
    super(`No production plan has been generated for ${deliveryDate}.`);
    this.name = 'ProductionPlanNotGenerated';
    this.deliveryDate = deliveryDate;
  }

  static is(error: unknown): error is ProductionPlanNotGenerated {
    return error instanceof ProductionPlanNotGenerated;
  }
}

type ApiProductionPlanItem = {
  id?: string;
  productId?: string;
  requiredQuantity?: string | number;
  producedQuantity?: string | number | null;
  shopCount?: number;
  product?: { name?: string; unit?: string; description?: string } | null;
};

type ApiProductionPlan = {
  id: string;
  productionDate?: string;
  status?: string;
  items?: ApiProductionPlanItem[] | null;
};

const numeric = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function fetchProductionPlan(deliveryDate: string): Promise<ApiProductionPlan> {
  try {
    return await apiGet<ApiProductionPlan>(`/production-plans/date/${deliveryDate}`);
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) {
      throw new ProductionPlanNotGenerated(deliveryDate);
    }
    throw error;
  }
}

/** FR-37 — the consolidated kitchen requirement for one delivery date. */
export async function getProductionRequirement(
  deliveryDate: string,
): Promise<ProductionRequirement> {
  const [plan, cutoffTime, activeShops] = await Promise.all([
    fetchProductionPlan(deliveryDate),
    getGlobalCutoffTime(),
    countActiveShops(),
  ]);

  const lines: ProductionLine[] = (plan.items ?? []).map(item => ({
    productId: item.productId ?? item.id ?? '',
    name: item.product?.name ?? item.productId ?? '',
    // The backend has no per-product "variant"; the description is the closest
    // thing the kitchen has to bake to.
    variant: item.product?.description ?? '',
    // categoryId is a uuid, not one of the domain's four kitchen sections, so
    // the section filter cannot be driven from it. See docs/api-gaps.md G8.
    category: 'cakes',
    unit: item.product?.unit ?? '',
    totalQuantity: numeric(item.requiredQuantity),
    // Not reported per line: the plan aggregates across shops without saying
    // how many contributed. See G8.
    shopCount: item.shopCount ?? 0,
  }));

  return {
    deliveryDate,
    // FR-17 — frozen once the cut-off for that delivery has passed. Derived
    // from the real global cut-off rather than a hardcoded constant.
    frozen:
      new Date(`${addDays(deliveryDate, -1)}T${cutoffTime}:00+05:30`).getTime() <
      Date.now(),
    totalShops: activeShops,
    lines: lines.sort((a, b) => b.totalQuantity - a.totalQuantity),
  };
}

/**
 * FR-37 drilled into one product. The plan reports aggregate quantities only —
 * no per-shop split, no per-item notes and no historical series — so the
 * breakdown and the demand trend come back empty and the screen says so.
 * See docs/api-gaps.md G8.
 */
export async function getProductionDetail(
  deliveryDate: string,
  productId: string,
): Promise<ProductionDetail> {
  const requirement = await getProductionRequirement(deliveryDate);
  const line = requirement.lines.find(candidate => candidate.productId === productId);

  if (!line) {
    throw new Error('Product not found in this production plan');
  }

  return {
    deliveryDate,
    productId,
    name: line.name,
    variant: line.variant,
    category: line.category,
    description: line.variant,
    unit: line.unit,
    totalQuantity: line.totalQuantity,
    shopCount: line.shopCount,
    totalShops: requirement.totalShops,
    trend: [],
    shops: [],
  };
}

export async function exportProductionRequirement(
  _deliveryDate: string,
  _format: ExportFormat,
): Promise<{ url: string }> {
  throw new NotImplementedOnServer(
    'exportProductionRequirement',
    'G11',
    'GET /production-plans/date/:date/export streams CSV rather than returning a URL, and offers no PDF',
  );
}
