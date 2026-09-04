/**
 * The home screen's "no data" behaviour.
 *
 * The design shows every section populated. Real shops hit three other cases,
 * and conflating them is how a dashboard tells someone the wrong thing:
 *
 *   - **empty**       — a true fact about the shop ("no order today")
 *   - **unavailable** — a fact about the request ("we could not ask")
 *   - **zero**        — a figure the server actually reported
 *
 * A blank card looks the same in all three. These assert that each section
 * renders the right one, and in particular that an absent figure never renders
 * as ₹0 — "you owe nothing" is a claim, and the wrong one to make on someone's
 * behalf.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import FinancialSummary from '../src/screens/shop/components/FinancialSummary';
import OrderTrackCard from '../src/screens/shop/components/OrderTrackCard';
import TomorrowOrderCard from '../src/screens/shop/components/TomorrowOrderCard';
import { paperTheme } from '../src/theme';
import { strings } from '../src/constants';
import type { Order } from '../src/types/admin';
import type { ShopCredit, ShopDashboard } from '../src/types/shop';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <PaperProvider theme={paperTheme}>{element}</PaperProvider>
      </SafeAreaProvider>,
    );
  });

  return tree;
}

/** Every string rendered anywhere in the tree, flattened. */
function textOf(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

const order = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 'ORD-0007',
    shopId: 's1',
    shopName: '',
    shopCode: '',
    ownerName: '',
    ownerPhone: '',
    orderDate: '2026-09-04',
    deliveryDate: '2026-09-05',
    cutoffAt: '',
    status: 'draft',
    statusHistory: [],
    items: [],
    subtotal: 0,
    taxTotal: 0,
    taxBreakdown: [],
    total: 12450,
    ...overrides,
  }) as Order;

describe('FinancialSummary — FR-20', () => {
  const dashboard = {
    shop: { id: 's1', code: '#204', name: 'Sector 15', creditLimit: 100000 },
    totalOrderedValue: 0,
    orderCount: 0,
    todayOrderCount: 0,
    quantityDelivered: 0,
    amountPaid: 145000,
    currentOutstanding: 24580,
    availableCredit: 75420,
    currentOrderStatus: 'none',
    statusBreakdown: {},
    topProducts: [],
  } as ShopDashboard;

  it('renders the three figures the design asks for', () => {
    const text = textOf(
      render(<FinancialSummary dashboard={dashboard} available />),
    );

    expect(text).toContain('24,580');
    expect(text).toContain('75,420');
    // 145000 is ₹1.45 L. Two decimals, because one would round it to ₹1.4 L
    // and hide ₹5,000 from a figure a shop reconciles against its statement.
    expect(text).toContain('1.45 L');
    // The credit limit is a round number, so its short form keeps no decimals.
    expect(text).toContain('Limit ₹1 L');
  });

  it('says so when the figures could not be loaded', () => {
    const text = textOf(render(<FinancialSummary available={false} />));

    expect(text).toContain(strings.shopHome.financialUnavailable);
  });

  it('renders an absent figure as "Not available", never as zero', () => {
    // The dashboard call succeeded but carried no `amountPaid`.
    const partial = { ...dashboard, amountPaid: undefined } as unknown as ShopDashboard;
    const text = textOf(render(<FinancialSummary dashboard={partial} available />));

    expect(text).toContain(strings.shopHome.financial.unavailable);
  });

  it('distinguishes a real zero from a missing figure', () => {
    const settled = { ...dashboard, currentOutstanding: 0 };
    const text = textOf(render(<FinancialSummary dashboard={settled} available />));

    // A shop that genuinely owes nothing sees ₹0, not "Not available".
    expect(text).toContain('₹0');
  });

  it('says when no credit limit is set rather than showing "Limit ₹0"', () => {
    const noLimit = {
      ...dashboard,
      shop: { ...dashboard.shop, creditLimit: 0 },
    };
    const credit = { creditLimit: 0 } as ShopCredit;
    const text = textOf(
      render(<FinancialSummary dashboard={noLimit} credit={credit} available />),
    );

    expect(text).toContain(strings.shopHome.financial.noLimit);
  });
});

describe('OrderTrackCard — FR-22', () => {
  it('shows the stage each order has reached', () => {
    const text = textOf(
      render(
        <OrderTrackCard
          today={order({ status: 'dispatched' })}
          tomorrow={order({ status: 'draft' })}
          available
          onOpen={jest.fn()}
        />,
      ),
    );

    expect(text).toContain('Dispatched');
    expect(text).toContain('Draft');
  });

  it('says "No order" for a day with none, per row', () => {
    const text = textOf(
      render(
        <OrderTrackCard
          today={order({ status: 'delivered' })}
          available
          onOpen={jest.fn()}
        />,
      ),
    );

    expect(text).toContain(strings.shopHome.track.none);
  });

  it('says "Not available" — not "No order" — when the lookup failed', () => {
    // The distinction matters: "No order" would tell a shop it had forgotten
    // to order when in fact nobody asked the server.
    const text = textOf(
      render(<OrderTrackCard available={false} onOpen={jest.fn()} />),
    );

    expect(text).toContain(strings.shopHome.track.unavailable);
    expect(text).not.toContain(strings.shopHome.track.none);
  });

  it('invites a first order when there is nothing to track at all', () => {
    const text = textOf(render(<OrderTrackCard available onOpen={jest.fn()} />));

    expect(text).toContain(strings.shopHome.track.empty);
  });
});

describe('TomorrowOrderCard — FR-9, FR-22', () => {
  const base = {
    deliveryDate: '2026-09-05',
    secondsToCutoff: 6120,
    cutoffPassed: false,
    cutoffAvailable: true,
    onPlaceOrder: jest.fn(),
    onContinueOrder: jest.fn(),
    onViewOrder: jest.fn(),
  };

  it('offers "Place Order" when nothing has been started', () => {
    const text = textOf(render(<TomorrowOrderCard {...base} />));

    expect(text).toContain(strings.shopHome.tomorrow.placeOrder);
    expect(text).toContain(strings.shopHome.tomorrow.noneMessage);
  });

  it('offers "Continue Order" for a draft', () => {
    const text = textOf(
      render(<TomorrowOrderCard {...base} order={order({ status: 'draft' })} />),
    );

    expect(text).toContain(strings.shopHome.tomorrow.continueOrder);
  });

  it('offers "View Order" and the value once submitted', () => {
    const text = textOf(
      render(
        <TomorrowOrderCard {...base} order={order({ status: 'submitted' })} />,
      ),
    );

    expect(text).toContain(strings.shopHome.tomorrow.viewOrder);
    expect(text).toContain('12,450');
  });

  it('renders the countdown in the form the design shows', () => {
    const text = textOf(render(<TomorrowOrderCard {...base} />));

    // 6120s = 1h 42m, which is what the design shows.
    expect(text).toContain('1h 42m');
  });

  it('says the cut-off has passed and closes the action', () => {
    const text = textOf(
      render(
        <TomorrowOrderCard {...base} secondsToCutoff={0} cutoffPassed />,
      ),
    );

    expect(text).toContain(strings.shopHome.tomorrow.cutoffPassed);
    expect(text).toContain(strings.shopHome.tomorrow.closed);
  });

  it('does NOT claim the cut-off passed when the lookup failed', () => {
    // Defaulting to "passed" would tell a shop ordering is closed when it is
    // not — the expensive direction to be wrong in.
    const text = textOf(
      render(<TomorrowOrderCard {...base} cutoffAvailable={false} />),
    );

    expect(text).toContain(strings.shopHome.tomorrow.cutoffUnavailable);
    expect(text).not.toContain(strings.shopHome.tomorrow.cutoffPassed);
  });

  it('says so when the delivery date is not known yet', () => {
    const text = textOf(
      render(<TomorrowOrderCard {...base} deliveryDate={undefined} />),
    );

    expect(text).toContain(strings.shopHome.tomorrow.dateUnknown);
  });
});
