import {
  toEffectiveCutoff,
  toInvoice,
  toNotificationFeed,
  toNotificationSettings,
  toOffer,
  toOrder,
  toPayment,
  toPaymentIntent,
  toShopCredit,
  toShopDashboard,
  toShopPayment,
} from '../src/services/mappers';
import { describePaymentOutcome } from '../src/services/shop/payments.api';

/**
 * The mappers are where a wrong field name becomes a wrong number on screen,
 * and the shop-owner surface is all money. These pin the field names against
 * what the backend's Prisma models actually emit — several of which differ
 * from the endpoint documentation.
 */

describe('toOrder — verified against the OrderItem model', () => {
  const payload = {
    id: 'uuid-1',
    orderNumber: 'ORD-0007',
    shopId: 's1',
    status: 'SUBMITTED',
    orderDate: '2026-09-04T06:00:00.000Z',
    deliveryDate: '2026-09-05T00:00:00.000Z',
    subtotal: '1590',
    taxAmount: '79.5',
    totalAmount: '1669.5',
    invoice: { id: 'inv-1', invoiceNumber: 'INV-0003' },
    items: [
      {
        productId: 'p1',
        productName: 'Classic Vanilla',
        quantity: '2',
        unitPrice: '520',
        totalAmount: '1040',
        notes: 'eggless',
      },
    ],
  };

  it('reads the line name from productName, not a nested product', () => {
    // The order include is `items: true` — there is no joined product, so
    // reading `product.name` left every line showing a raw uuid.
    expect(toOrder(payload).items[0].name).toBe('Classic Vanilla');
  });

  it('reads the line value from totalAmount, not lineTotal', () => {
    expect(toOrder(payload).items[0].lineTotal).toBe(1040);
  });

  it('reads tax from taxAmount, not taxTotal', () => {
    // Reading only `taxTotal` reported every order as tax-free.
    expect(toOrder(payload).taxTotal).toBe(79.5);
  });

  it('resolves the invoice id from the joined invoice', () => {
    expect(toOrder(payload).invoiceId).toBe('inv-1');
  });

  it('parses decimals that arrive as strings', () => {
    expect(toOrder(payload).total).toBe(1669.5);
    expect(toOrder(payload).items[0].orderedQty).toBe(2);
  });

  it('keeps the uuid as the id and the number as a separate field', () => {
    // `id` is what `/orders/:id/submit`, PATCH and DELETE are called with.
    // Putting `orderNumber` there made every write on a shop's own order fail
    // validation before it reached a row.
    const order = toOrder(payload);

    expect(order.id).toBe('uuid-1');
    expect(order.orderNumber).toBe('ORD-0007');
  });

  it('falls back to the id when the payload carries no order number', () => {
    expect(toOrder({ ...payload, orderNumber: undefined } as never).orderNumber).toBe(
      'uuid-1',
    );
  });

  it('still maps a payload using the older field spellings', () => {
    const legacy = toOrder({
      ...payload,
      taxAmount: undefined,
      taxTotal: '12',
      items: [
        {
          productId: 'p1',
          quantity: '1',
          unitPrice: '100',
          lineTotal: '100',
          product: { name: 'Legacy', unit: 'kg' },
        },
      ],
    } as never);

    expect(legacy.taxTotal).toBe(12);
    expect(legacy.items[0].name).toBe('Legacy');
  });
});

describe('toPayment — verified against the Payment model', () => {
  it('reads the state from paymentStatus, not status', () => {
    // There is no `status` column; reading it left every badge blank.
    expect(
      toPayment({ id: 'x', paymentStatus: 'PENDING_CONFIRMATION' }).status,
    ).toBe('PENDING_CONFIRMATION');
  });
});

describe('toShopPayment — FR-29', () => {
  it('maps the method and status into domain values', () => {
    const payment = toShopPayment({
      id: 'pay-1',
      paymentReference: 'PAY-0001',
      amount: '2480',
      paymentMethod: 'NET_BANKING',
      paymentStatus: 'PENDING_CONFIRMATION',
      paymentDate: '2026-09-04T10:00:00.000Z',
      invoice: { id: 'inv-1', invoiceNumber: 'INV-0003' },
    });

    expect(payment.method).toBe('netBanking');
    expect(payment.status).toBe('pendingConfirmation');
    expect(payment.amount).toBe(2480);
    expect(payment.date).toBe('2026-09-04');
    expect(payment.invoiceNumber).toBe('INV-0003');
  });

  it('falls back to the transaction id when no reference was issued', () => {
    expect(toShopPayment({ id: 'pay-2', transactionId: 'idem-9' }).reference).toBe(
      'idem-9',
    );
  });
});

describe('toEffectiveCutoff — FR-9', () => {
  const shopId = 's1';

  it('derives an ISO instant and a countdown from the cut-off time', () => {
    const cutoff = toEffectiveCutoff({ cutoffTime: '23:59' }, shopId, '22:00');

    expect(cutoff.cutoffTime).toBe('23:59');
    expect(cutoff.shopId).toBe(shopId);
    expect(Number.isNaN(Date.parse(cutoff.cutoffAt))).toBe(false);
    // Never negative: a passed cut-off floors at zero rather than counting up.
    expect(cutoff.secondsRemaining).toBeGreaterThanOrEqual(0);
    expect(cutoff.secondsRemaining).toBe(
      cutoff.passed
        ? 0
        : Math.max(
            Math.floor((Date.parse(cutoff.cutoffAt) - Date.now()) / 1000),
            0,
          ),
    );
  });

  it('falls back to the PRD default when no cut-off is configured', () => {
    // `GET /cutoff/global` answers `data: null` until an admin sets one, and
    // FR-13 documents 22:00 as the system default.
    expect(toEffectiveCutoff(null, shopId, '22:00').cutoffTime).toBe('22:00');
  });

  it('reports a cut-off already in the past as passed with no time left', () => {
    const cutoff = toEffectiveCutoff({ cutoffTime: '00:00' }, shopId, '22:00');

    expect(cutoff.passed).toBe(true);
    expect(cutoff.secondsRemaining).toBe(0);
  });

  it('targets the next day, which is the only date the API accepts', () => {
    const cutoff = toEffectiveCutoff({ cutoffTime: '22:00' }, shopId, '22:00');

    expect(cutoff.deliveryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('toShopDashboard — FR-20', () => {
  it('maps the tiles and parses string decimals', () => {
    const dashboard = toShopDashboard({
      shop: { id: 's1', shopCode: 'CC001', shopName: 'Main', creditLimit: '50000' },
      totalOrderedValue: '18400',
      orderCount: 12,
      quantityDelivered: '240',
      amountPaid: '10000',
      currentOutstanding: '8400',
      availableCredit: '41600',
      currentOrderStatus: 'IN_PRODUCTION',
      statusBreakdown: { SUBMITTED: 2, DELIVERED: 9, NO_ORDER_PLACED: 4 },
      topProducts: [{ name: 'Vanilla', quantity: '40', value: '20800' }],
    });

    expect(dashboard.shop.creditLimit).toBe(50000);
    expect(dashboard.totalOrderedValue).toBe(18400);
    expect(dashboard.currentOrderStatus).toBe('in_production');
    expect(dashboard.topProducts[0].quantity).toBe(40);
  });

  it('skips NO_ORDER_PLACED, which is a cut-off placeholder not a state', () => {
    const dashboard = toShopDashboard({
      statusBreakdown: { SUBMITTED: 2, NO_ORDER_PLACED: 4 },
    });

    expect(dashboard.statusBreakdown.submitted).toBe(2);
    expect(Object.keys(dashboard.statusBreakdown)).toHaveLength(1);
  });

  it('reports "none" when nothing is in the pipeline', () => {
    expect(toShopDashboard({ currentOrderStatus: 'NONE' }).currentOrderStatus).toBe(
      'none',
    );
  });
});

describe('toShopCredit — PRD §8', () => {
  it('carries the per-shop answer to blocked-or-warned', () => {
    expect(
      toShopCredit({ creditBehavior: 'BLOCK_ORDER', availableCredit: '0' }, 's1')
        .creditBehavior,
    ).toBe('blockOrder');
  });

  it('defaults to warning, matching the column default', () => {
    expect(toShopCredit({}, 's1').creditBehavior).toBe('warn');
  });
});

describe('toInvoice — FR-25', () => {
  const payload = {
    id: 'inv-1',
    invoiceNumber: 'INV-0003',
    shopId: 's1',
    invoiceDate: '2026-09-05T00:00:00.000Z',
    dueDate: '2026-09-20T00:00:00.000Z',
    subtotal: '1590',
    taxAmount: '0',
    discountAmount: '0',
    totalAmount: '1590',
    paidAmount: '590',
    outstandingAmount: '1000',
    status: 'PARTIALLY_PAID',
    basedOnDelivered: true,
    items: [
      {
        productId: 'p1',
        productName: 'Classic Vanilla',
        quantity: '2',
        unitPrice: '520',
        totalAmount: '1040',
      },
    ],
  };

  it('maps the money and the status', () => {
    const invoice = toInvoice(payload);

    expect(invoice.number).toBe('INV-0003');
    expect(invoice.status).toBe('partially_paid');
    expect(invoice.paid).toBe(590);
    expect(invoice.outstanding).toBe(1000);
    expect(invoice.lines[0].lineTotal).toBe(1040);
  });

  it('records which quantity the invoice was raised on — PRD §8', () => {
    expect(toInvoice(payload).basedOnDelivered).toBe(true);
    expect(toInvoice({ ...payload, basedOnDelivered: false }).basedOnDelivered).toBe(
      false,
    );
  });

  it('derives the outstanding amount when the server omits it', () => {
    const invoice = toInvoice({ ...payload, outstandingAmount: undefined });
    expect(invoice.outstanding).toBe(1000);
  });
});

describe('toOffer — FR-34', () => {
  it('maps the discount shape and the targeted products', () => {
    const offer = toOffer({
      id: 'o1',
      title: 'Festive 10%',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T00:00:00.000Z',
      status: 'ACTIVE',
      products: [{ productId: 'p1' }, { productId: 'p2' }],
    });

    expect(offer.discountType).toBe('percentage');
    expect(offer.discountValue).toBe(10);
    expect(offer.status).toBe('active');
    expect(offer.productIds).toEqual(['p1', 'p2']);
    expect(offer.endDate).toBe('2026-09-30');
  });

  it('treats an offer naming no products as catalogue-wide', () => {
    expect(
      toOffer({ id: 'o2', discountType: 'FLAT', status: 'ACTIVE' }).productIds,
    ).toEqual([]);
  });
});

describe('toNotificationFeed — FR-44', () => {
  it('maps rows and carries the unread count', () => {
    const feed = toNotificationFeed(
      {
        unreadCount: 2,
        notifications: [
          {
            id: 'n1',
            type: 'CUT_OFF_REMINDER',
            title: 'Cut-off in 2 hours',
            body: 'Submit tomorrow’s order.',
            isRead: false,
          },
        ],
      },
      1,
    );

    expect(feed.items[0].type).toBe('cutoffReminder');
    expect(feed.items[0].category).toBe('cutoff');
    expect(feed.unreadCount).toBe(2);
  });

  it('drops an unrecognised type rather than failing the whole feed', () => {
    // A list is not a figure: omitting one row understates nothing the user
    // would act on, whereas throwing would blank the screen.
    const feed = toNotificationFeed(
      {
        unreadCount: 0,
        notifications: [
          { id: 'n1', type: 'SOMETHING_NEW' },
          { id: 'n2', type: 'NEW_OFFER', title: 'Offer' },
        ],
      },
      2,
    );

    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].id).toBe('n2');
  });
});

describe('toNotificationSettings — FR-45', () => {
  it('fills the full event list from a partial server response', () => {
    // The backend stores a row only once a preference has been changed.
    const settings = toNotificationSettings([
      { type: 'ORDER_DISPATCHED', push: false },
    ]);

    expect(settings).toHaveLength(12);
    expect(
      settings.find(setting => setting.type === 'orderDispatched')?.push,
    ).toBe(false);
    expect(settings.find(setting => setting.type === 'orderAccepted')?.push).toBe(
      true,
    );
  });

  it('keeps cut-off and financial alerts on regardless of what is stored', () => {
    // FR-45: they cannot be muted. The backend accepts muting them anyway.
    const settings = toNotificationSettings([
      { type: 'PAYMENT_OVERDUE', push: false },
      { type: 'CUT_OFF_REMINDER', push: false },
    ]);

    const overdue = settings.find(setting => setting.type === 'paymentOverdue');
    const cutoff = settings.find(setting => setting.type === 'cutoffReminder');

    expect(overdue?.push).toBe(true);
    expect(overdue?.muteable).toBe(false);
    expect(cutoff?.push).toBe(true);
    expect(cutoff?.muteable).toBe(false);
  });

  it('marks order and offer notices as muteable', () => {
    const settings = toNotificationSettings([]);

    expect(settings.find(s => s.type === 'orderDelivered')?.muteable).toBe(true);
    expect(settings.find(s => s.type === 'newOffer')?.muteable).toBe(true);
  });
});

describe('describePaymentOutcome — FR-29, FR-30', () => {
  const payment = {
    id: 'pay-1',
    paymentReference: 'PAY-0001',
    amount: '1000',
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING_CONFIRMATION',
  };

  it('reports an offline payment as awaiting the admin — FR-30', () => {
    const outcome = describePaymentOutcome(
      toPaymentIntent({ payment, gatewayStatus: 'OFFLINE', message: '' }),
    );

    expect(outcome.kind).toBe('awaitingConfirmation');
  });

  it('hands off when a gateway returns a checkout URL', () => {
    const outcome = describePaymentOutcome(
      toPaymentIntent({
        payment: { ...payment, paymentMethod: 'UPI' },
        gatewayStatus: 'LIVE',
        gatewayUrl: 'https://pay.example/checkout/1',
        message: '',
      }),
    );

    expect(outcome.kind).toBe('gatewayHandoff');
  });

  it('does NOT report success when no gateway is wired', () => {
    // The sandbox response carries no checkout URL: the payment row is real
    // and PENDING, but nothing can settle it. Calling that a success would be
    // a lie about money.
    const outcome = describePaymentOutcome(
      toPaymentIntent({
        payment: { ...payment, paymentMethod: 'UPI', paymentStatus: 'PENDING' },
        gatewayStatus: 'SANDBOX',
        message: 'Payment initiated. Await gateway confirmation.',
      }),
    );

    expect(outcome.kind).toBe('gatewayUnavailable');
  });
});
