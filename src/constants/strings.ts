/**
 * Every user-facing string in the admin surface.
 *
 * PRD §5 Localisation asks for "a string layer ready for regional languages":
 * screens read from this object rather than embedding literals, so adding a
 * locale later means adding a sibling object and a lookup, not touching JSX.
 * Values that vary at runtime are functions returning the finished sentence,
 * because word order changes between languages.
 */

export const strings = {
  common: {
    add: 'Add',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    confirm: 'Confirm',
    edit: 'Edit',
    delete: 'Delete',
    deactivate: 'Deactivate',
    view: 'View',
    back: 'Back',
    export: 'Export',
    exportCsv: 'Export CSV',
    exportPdf: 'Export PDF',
    search: 'Search',
    filters: 'Filters',
    clearFilters: 'Clear filters',
    apply: 'Apply',
    all: 'All',
    loading: 'Loading...',
    somethingWentWrong: 'Something went wrong. Please try again.',
    offlineBanner: 'Showing saved data. Reconnect to refresh.',
    page: (page: number, total: number) => `Page ${page} of ${total}`,
    showingCount: (shown: number, total: number) => `Showing ${shown} of ${total}`,
    selectedCount: (count: number) => `${count} selected`,
  },

  dashboard: {
    title: 'Network overview',
    greeting: (name: string) => `Signed in as ${name}`,
    logout: 'Log out',
    tiles: {
      totalShops: 'Total shops',
      shopsSplit: (active: number, suspended: number) =>
        `${active} active · ${suspended} suspended`,
      ordersToday: 'Orders received today',
      pendingCutoff: 'Pending against cut-off',
      todaysValue: 'Today’s order value',
      networkOutstanding: 'Network outstanding',
      collectionsToday: 'Collections today',
    },
    cutoff: {
      title: 'Cut-off',
      countdownLabel: (time: string) => `Cut-off at ${time} IST`,
      remaining: (duration: string) => `${duration} remaining`,
      passed: 'Cut-off has passed. Orders are frozen.',
      submitted: (submitted: number, expected: number) =>
        `${submitted} of ${expected} shops submitted`,
      noOrder: (count: number) => `${count} marked "No order placed"`,
    },
    production: {
      title: 'Tomorrow’s production',
      kicker: 'Production requirement',
      subtitle: (date: string) => `For delivery on ${date}`,
      frozen: 'Frozen at cut-off',
      provisional: 'Provisional until cut-off',
      exportForKitchen: 'Export for kitchen',
      empty: 'No orders submitted for tomorrow yet.',
      viewFullPlan: 'View full production plan',
      moreItems: (count: number) => `+${count} more items`,
      notGenerated:
        "Tomorrow's production plan has not been generated yet. It is created from submitted orders once the cut-off passes.",
    },
    charts: {
      trendTitle: 'Order value trend',
      topProductsTitle: 'Top products by quantity',
      empty: 'No data for this range.',
      /**
       * Distinct from `empty`: "no data" and "we cannot ask for this data" look
       * identical on a blank chart but mean opposite things to whoever reads it.
       */
      unavailable:
        'Daily order-value trend is not available from the server yet.',
    },
    recentOrders: 'Recent orders',
    quickActions: 'Quick actions',
    actionOrders: 'All orders',
    actionShops: 'All shops',
    actionPayments: 'Payments queue',
    actionReports: 'Reports',
  },

  shops: {
    title: 'All shops',
    add: 'Add shop',
    searchPlaceholder: 'Search name, code or owner',
    statusLabel: 'Status',
    regionLabel: 'Region',
    sortLabel: 'Sort by',
    ageingToggle: 'Ageing view',
    ageingTitle: 'Outstanding by age',
    ageingBucket: (label: string) => `${label} days`,
    ageingShops: (count: number) => `${count} shops`,
    creditUtilisation: (percent: string) => `Credit used ${percent}`,
    outstanding: 'Outstanding',
    paidToDate: 'Paid to date',
    todaysOrder: 'Today’s order',
    noOrderToday: 'No order placed',
    empty: 'No shops match these filters.',
    suspend: 'Suspend',
    reactivate: 'Reactivate',
    deactivate: 'Deactivate',
    suspendTitle: 'Suspend this shop?',
    suspendMessage: (name: string) =>
      `${name} will keep access to its history but will not be able to place orders. This action is recorded in the audit trail.`,
    deactivateTitle: 'Deactivate this shop?',
    deactivateMessage: (name: string) =>
      `${name} will lose access to the app entirely. Existing orders and ledger entries are retained. This action is recorded in the audit trail.`,
    reactivateTitle: 'Reactivate this shop?',
    reactivateMessage: (name: string) => `${name} will be able to place orders again.`,
    statusChanged: 'Shop status updated.',
  },

  shopDetails: {
    title: 'Shop profile',
    createTitle: 'Add new shop',
    editTitle: 'Edit shop',
    sectionProfile: 'Profile',
    sectionCredit: 'Credit management',
    sectionMonthly: 'Monthly summary',
    sectionOrders: 'Order history',
    sectionLedger: 'Ledger',
    sectionPayments: 'Payments received',
    sectionAudit: 'Audit trail',
    tabs: {
      overview: 'Overview',
      orders: 'Orders',
      ledger: 'Ledger',
      payments: 'Payments',
    },
    franchiseOwner: 'Franchise owner',
    contactNumber: 'Contact number',
    taxId: 'GSTIN / Tax ID',
    moreDetails: 'More details',
    hideDetails: 'Hide details',
    statusToggle: 'Shop status',
    creditUsedCaption: (used: string, limit: string) => `${used} of ${limit} limit`,
    creditUtilisationCaption: (percent: string) => `${percent} of the limit is in use`,
    creditHealthy: 'Credit in good health',
    creditWatch: 'Approaching the credit limit',
    creditBreached: 'Credit limit exhausted',
    ordersThisMonth: 'Orders this month',
    totalOrderValue: 'Total order value',
    paymentsReceived: 'Payments received',
    adjustCreditLimit: 'Adjust credit limit',
    adjustCreditTitle: 'Adjust credit limit',
    adjustCreditHint: 'The new limit applies to the shop’s next order immediately.',
    orderValue: 'Order value',
    orderLines: (lines: number, units: string) =>
      `${lines} ${lines === 1 ? 'line' : 'lines'} · ${units} units`,
    shortSupply: 'Short supply',
    ordersInRange: (count: number) => `${count} ${count === 1 ? 'order' : 'orders'}`,
    ledgerBilled: 'Billed',
    ledgerReceived: 'Received',
    ledgerClosing: 'Closing balance',
    balanceAfter: (amount: string) => `Bal ${amount}`,
    noPayments: 'No payments or credit notes in this range.',
    ledgerTypes: {
      order: 'Order',
      invoice: 'Invoice',
      payment: 'Payment',
      credit_note: 'Credit note',
      adjustment: 'Adjustment',
    },
    deactivateShop: 'Deactivate shop',
    creditLimit: 'Credit limit',
    creditUsed: 'Credit used',
    creditAvailable: 'Available credit',
    priceList: 'Price list',
    cutoffOverride: 'Cut-off override',
    cutoffGlobal: 'Uses the global cut-off',
    adjustment: 'Add credit note / adjustment',
    adjustmentTitle: 'Manual adjustment',
    adjustmentHint:
      'Positive amounts increase what the shop owes; negative amounts issue a credit.',
    runningBalance: 'Balance',
    noLedger: 'No ledger entries in this range.',
    noOrders: 'This shop has not placed any orders yet.',
    noAudit: 'No administrative actions recorded yet.',
    inviteSent: 'Invite sent. The owner completes their profile on first login.',
    created: 'Shop created.',
    updated: 'Shop updated.',
    adjustmentPosted: 'Adjustment posted to the ledger.',
    fields: {
      name: 'Shop name',
      code: 'Shop code',
      ownerName: 'Owner name',
      ownerPhone: 'Owner phone',
      ownerEmail: 'Owner email',
      address: 'Street address',
      mobileNumber: 'Shop mobile number',
      city: 'City',
      state: 'State',
      pincode: 'Pincode',
      gstin: 'GSTIN',
      region: 'Region',
      creditLimit: 'Credit limit',
      priceList: 'Price list',
      amount: 'Amount',
      reference: 'Reference',
      description: 'Description',
    },
    /** FR-2 — a shop edit spans three endpoints and can half-succeed. */
    parts: {
      details: 'Details',
      creditLimit: 'Credit limit',
      priceList: 'Price list',
    } as Record<string, string>,
    partialSave: (saved: string[], failed: string[]) =>
      `${saved.join(' and ')} saved. ${failed.join(' and ')} could not be saved - try again.`,
    adjustmentKind: 'Entry type',
    adjustmentKindAdjustment: 'Adjustment',
    adjustmentKindCreditNote: 'Credit note',
    adjustmentDirection: 'Direction',
    adjustmentDirectionDebit: 'Debit - increases what the shop owes',
    adjustmentDirectionCredit: 'Credit - reduces what the shop owes',
    adjustmentReason: 'Reason',
    creditBehavior: 'When the limit is exceeded',
    creditBehaviorWarn: 'Warn the shop',
    creditBehaviorBlock: 'Block new orders',
    errors: {
      required: 'This field is required.',
      phone: 'Enter a 10-digit mobile number.',
      email: 'Enter a valid email address.',
      gstin: 'Enter a valid 15-character GSTIN.',
      reasonRequired: 'A credit note needs a reason.',
      creditLimit: 'Enter a credit limit of zero or more.',
      amount: 'Enter a non-zero amount.',
    },
  },

  orders: {
    title: 'Orders',
    subtitle: 'Franchise order management',
    searchPlaceholder: 'Search by shop, order ID or item...',
    selectRange: 'Select range',
    filtersTitle: 'Filter orders',
    dateRangeLabel: 'Date range',
    filterSummary: (count: number) =>
      `${count} ${count === 1 ? 'filter' : 'filters'} applied`,
    itemsAndValue: 'Items & value',
    itemsAndValueCount: (items: number, value: string) =>
      `${items} ${items === 1 ? 'item' : 'items'} · ${value}`,
    statusAgo: (status: string, ago: string) => `${status} ${ago}`,
    quickAccept: 'Accept order',
    selectionHint: 'Long-press an order to select several at once.',
    statusLabel: 'Status',
    shopLabel: 'Shop',
    dateFieldLabel: 'Date',
    orderDate: 'Order date',
    deliveryDate: 'Delivery date',
    pendingCutoff: 'Pending cut-off',
    empty: 'No orders match these filters.',
    /**
     * The list is genuinely unfiltered by date here, so saying so beats
     * showing rows that look filtered and are not.
     */
    dateFilterUnsupported:
      'Showing all dates. Filtering orders by a date range is not supported by the server yet.',
    emptyPendingCutoff: 'Every shop has submitted for this cut-off.',
    bulkAccept: 'Accept selected',
    bulkProduction: 'Move to production',
    bulkCancel: 'Cancel selected',
    bulkTitle: (action: string, count: number) => `${action} ${count} orders?`,
    bulkMessage: (action: string, count: number) =>
      `This applies "${action}" to ${count} orders and records each change in the audit trail.`,
    bulkUnavailable:
      'Bulk status changes are not supported by the server yet. Move orders one at a time so none is left half-moved.',
    bulkDone: (count: number) => `${count} orders updated.`,
    bulkFailed: 'Bulk update failed. No orders were changed.',
    exportStarted: (format: string) => `Export queued as ${format.toUpperCase()}.`,
    timelineTitle: 'Status timeline',
  },

  orderDetails: {
    title: 'Order detail',
    subtitle: (shop: string, orderId: string) => `${shop} · ${orderId}`,
    progress: 'Order progress',
    itemsCount: (count: number) => `Order items (${count})`,
    itemNote: (note: string) => `Note: ${note}`,
    deliveringNote: (quantity: string) => `Delivering ${quantity}`,
    sectionShop: 'Shop',
    captureShortSupply: 'Capture short supply',
    startProduction: 'Start production',
    items: 'Items',
    ordered: 'Ordered',
    delivered: 'Delivered',
    unitPrice: 'Unit price',
    lineTotal: 'Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Order total',
    shortSupply: 'Short supply',
    shortSupplyNote: 'Delivered quantity is below the ordered quantity.',
    contact: 'Shop contact',
    submittedAt: 'Submitted',
    notSubmitted: 'Not submitted',
    cutoffAt: 'Cut-off',
    afterCutoff: 'Submitted after cut-off',
    reopened: 'Reopened by admin',
    reopenUnavailable:
      'Reopening an order after cut-off is not supported by the server yet. The exception has to be audit-logged server-side.',
    reopenAction: 'Reopen after cut-off',
    reopenTitle: 'Reopen this order?',
    reopenMessage:
      'The shop will be able to edit and resubmit this order. The reopen is recorded in the audit trail with your name and reason.',
    reopenReasonLabel: 'Reason',
    reopenReasonRequired: 'A reason is required to reopen an order.',
    reopenDone: 'Order reopened. The shop has been notified.',
    accept: 'Accept order',
    reject: 'Reject order',
    markDispatched: 'Mark dispatched',
    markDelivered: 'Mark delivered',
    generateInvoice: 'Generate invoice',
    cancel: 'Cancel order',
    printOrder: 'Print order',
    exportPdf: 'Export as PDF',
    viewInvoice: 'View invoice',
    deliveredTitle: 'Record delivery',
    deliveredMessage:
      'Enter the quantity actually delivered for each line. Anything below the ordered quantity is recorded as short supply.',
    confirmTransition: (label: string) => `${label}?`,
    transitionMessage: (label: string) =>
      `This moves the order to "${label}" and notifies the shop. The change is recorded in the audit trail.`,
    statusUpdated: 'Order status updated.',
    cancelTitle: 'Cancel this order?',
    cancelMessage:
      'The shop will be notified that the order was cancelled. This cannot be undone.',
  },

  shortSupply: {
    title: 'Short supply',
    subtitle: (orderId: string, shop: string) => `${orderId} · ${shop}`,
    intro:
      'Indicate quantities that cannot be fully fulfilled for tomorrow’s run. Shops will be automatically notified.',
    ordered: 'Ordered',
    delivering: 'Delivering',
    shortfall: 'Shortfall',
    reasonLabel: 'Reason for shortage',
    reasonPlaceholder: 'Select a reason',
    reasonRequired: 'Choose a reason for every short line.',
    reasons: {
      stock: 'Stock shortage',
      ingredient: 'Ingredient unavailable',
      production: 'Production delay',
      quality: 'Quality rejection',
      capacity: 'Kitchen capacity',
      other: 'Other',
    },
    summaryNone: 'Every line is being delivered in full.',
    summaryShort: (lines: number) =>
      `${lines} ${lines === 1 ? 'line' : 'lines'} short of the ordered quantity.`,
    confirm: 'Confirm short supply',
    confirmTitle: 'Confirm short supply?',
    confirmMessage: (lines: number, shop: string) =>
      `${lines} ${lines === 1 ? 'line' : 'lines'} will be sent short and ${shop} will be notified. The change is recorded in the audit trail.`,
    recorded: 'Short supply recorded. The shop has been notified.',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
  },

  productionPlan: {
    title: 'Production requirement',
    subtitle: 'Consolidated baking schedule',
    searchPlaceholder: 'Search bakery items...',
    tomorrow: 'Tomorrow',
    today: 'Today',
    columnProduct: 'Bakery product',
    columnShops: 'Shops',
    columnQty: 'Qty req.',
    shops: (count: number) => `${count} ${count === 1 ? 'shop' : 'shops'}`,
    exportPlan: 'Export production plan (PDF/CSV)',
    empty: 'Nothing to bake for this date yet.',
    emptyFiltered: 'No items match this search or section.',
    totals: (items: number, quantity: string) => `${items} items · ${quantity} total`,
    categories: {
      all: 'All items',
      cakes: 'Cakes',
      pastries: 'Pastries',
      savoury: 'Savoury',
      dryItems: 'Dry items',
    },
  },

  productionDetail: {
    title: 'Production detail',
    subtitle: 'Order breakdown by shop',
    totalRequired: 'Total qty required',
    orderingShops: 'Ordering shops',
    orderingShopsValue: (ordered: number, total: number) => `${ordered} / ${total}`,
    demandTrend: 'Demand trend (last 7 days)',
    shopBreakdown: 'Shop breakdown',
    noNote: 'No special notes',
    empty: 'No shop has ordered this item for this date.',
    unitSuffix: (quantity: string, unit: string) => `${quantity} ${unit}`,
  },

  /** FR-5, FR-6, FR-15 — catalogue, price lists and categories. */
  catalogue: {
    title: 'Catalogue & price lists',
    subtitle: 'Products, categories and the prices each shop pays.',
    tabs: {
      products: 'Products',
      categories: 'Categories',
      priceLists: 'Price lists',
    },

    searchPlaceholder: 'Search by name or SKU',
    statusLabel: 'Status',
    categoryLabel: 'Category',
    addProduct: 'Add product',
    addCategory: 'Add category',
    addPriceList: 'Add price list',

    columns: {
      product: 'Product',
      sku: 'SKU',
      category: 'Category',
      price: 'Base price',
      unit: 'Unit',
      moq: 'MOQ',
      packSize: 'Pack size',
      status: 'Status',
    },

    productCount: (count: number) =>
      `${count} product${count === 1 ? '' : 's'}`,
    leadTime: (hours: number) =>
      hours > 0 ? `${hours}h lead time` : 'Next-day delivery',
    itemCount: (count: number) => `${count} priced item${count === 1 ? '' : 's'}`,

    emptyProducts: 'No products match these filters.',
    emptyCategories: 'No categories yet. Add one before creating products.',
    emptyPriceLists: 'No price lists yet.',

    productCreated: 'Product added.',
    productUpdated: 'Product updated.',
    productDeleted: 'Product deactivated.',
    categoryCreated: 'Category added.',
    categoryUpdated: 'Category updated.',
    categoryDeleted: 'Category deactivated.',
    priceListCreated: 'Price list created.',
    priceListUpdated: 'Price list updated.',
    priceListDeleted: 'Price list deactivated.',
    itemsAdded: 'Prices added to the list.',
    itemUpdated: 'Price updated.',
    itemRemoved: 'Product removed from the list.',
    priceListAssigned: 'Price list assigned to the shop.',
    availabilitySaved: 'Availability saved for that date.',
    availabilityCleared: 'Availability override removed.',

    productTitle: 'Add product',
    productEditTitle: 'Edit product',
    categoryTitle: 'Add category',
    categoryEditTitle: 'Edit category',
    priceListTitle: 'New price list',
    priceListEditTitle: 'Edit price list',
    availabilityTitle: 'Set availability',
    itemPriceTitle: 'Update price',

    /*
     * The API's delete is a soft delete: the row stays and is flagged inactive
     * (verified live — see docs/api-gaps.md G14). The copy says "deactivate"
     * because "delete" would promise something that does not happen.
     */
    deleteProductTitle: 'Deactivate this product?',
    deleteProductMessage: (name: string) =>
      `${name} will be marked inactive and hidden from new orders. It stays in the catalogue, and orders that already reference it keep their snapshot price.`,
    deleteCategoryTitle: 'Deactivate this category?',
    deleteCategoryMessage: (name: string) =>
      `${name} will be marked inactive. It stays in the list and can be reactivated.`,
    /** FR-15 — a category with products cannot be safely removed. */
    categoryInUse: (count: number) =>
      `This category still holds ${count} product${
        count === 1 ? '' : 's'
      }. Move or delete them first.`,
    deletePriceListTitle: 'Deactivate this price list?',
    deletePriceListMessage: (name: string) =>
      `${name} will be marked inactive. Shops assigned to it fall back to base prices.`,

    /**
     * FR-5 — availability can be written but never read back, so the screen
     * cannot show which dates are already set. Saying so beats an empty
     * calendar, which would read as "available every day".
     */
    availabilityWriteOnly:
      'Availability can be set for a date, but the server does not report existing overrides yet, so this list cannot show them.',
    /** FR-6 — regions exist on a price list but no shop carries one. */
    regionUnsupported:
      'Region targeting is stored but cannot be applied: shops have no region field yet.',

    fields: {
      name: 'Name',
      sku: 'SKU',
      category: 'Category',
      description: 'Description',
      imageUrl: 'Image URL',
      unit: 'Unit',
      basePrice: 'Base price',
      moq: 'Minimum order quantity',
      packSize: 'Pack size',
      status: 'Status',
      leadTimeHours: 'Lead time (hours)',
      region: 'Region',
      price: 'Price',
      date: 'Date',
      available: 'Available',
      shop: 'Shop',
    },

    errors: {
      name: 'Enter a name.',
      sku: 'Enter a SKU.',
      category: 'Choose a category.',
      price: 'Enter a price of zero or more.',
      quantity: 'Enter a whole number of one or more.',
      leadTime: 'Enter a whole number of hours, or zero.',
      date: 'Enter a date as YYYY-MM-DD.',
    },
  },

  /* ------------------------------------------------------------------------ */
  /* Shop owner — FR-4, FR-7 to FR-12, FR-19 to FR-30, FR-34, FR-43 to FR-45   */
  /* ------------------------------------------------------------------------ */

  /** The four tabs of the shop-owner shell. */
  shopTabs: {
    home: 'Home',
    orders: 'Orders',
    ledger: 'Ledger',
    more: 'More',
  },

  shopHome: {
    title: 'Your shop',
    /** Time-of-day greeting, resolved in IST so it matches the shop's clock. */
    greetingMorning: (name: string) => `Good Morning, ${name}`,
    greetingAfternoon: (name: string) => `Good Afternoon, ${name}`,
    greetingEvening: (name: string) => `Good Evening, ${name}`,
    noShop: 'No outlet assigned',
    noShopMessage:
      'This login is not linked to a shop yet. The franchise owner assigns one before you can order. If they just did, check again.',
    checkAgain: 'Check again',
    noShopName: 'Outlet name not set',
    notifications: 'Notifications',
    account: 'Account and settings',

    /* Hero card — FR-9, FR-22 */
    tomorrow: {
      kicker: "TOMORROW'S ORDER",
      /** Shown while the delivery date is still loading. */
      dateUnknown: 'Delivery date unavailable',
      none: 'No order started yet',
      noneMessage:
        'Nothing has been ordered for tomorrow. Start one before the cut-off.',
      orderValue: 'Order value',
      valueUnavailable: 'Not priced yet',
      cutoffIn: (duration: string) => `Cut-off in ${duration}`,
      cutoffPassed: 'Cut-off has passed',
      cutoffUnavailable: 'Cut-off time unavailable',
      placeOrder: 'Place Order',
      continueOrder: 'Continue Order',
      viewOrder: 'View Order',
      closed: 'Ordering is closed for tomorrow',
    },

    /* Financial summary — FR-20 */
    financialTitle: 'FINANCIAL SUMMARY',
    financial: {
      outstanding: 'Outstanding',
      availableCredit: 'Avail. Credit',
      paidThisMonth: 'Paid (Mo)',
      limit: (amount: string) => `Limit ${amount}`,
      noLimit: 'No limit set',
      unavailable: 'Not available',
    },
    financialUnavailable:
      'Your balance could not be loaded. Pull down to try again.',

    /* Order track — FR-22 */
    trackTitle: 'ORDER TRACK',
    track: {
      today: "Today's Order",
      tomorrow: "Tomorrow's Order",
      none: 'No order',
      unavailable: 'Not available',
      empty: 'No orders to track yet. Your first order appears here.',
    },

    /* Quick actions */
    quickActionsTitle: 'QUICK ACTIONS',
    actionPlaceOrder: 'Place Order',
    actionRepeatLast: 'Repeat Last',
    actionPayNow: 'Pay Now',
    actionViewLedger: 'View Ledger',

    /* Active offers — FR-34 */
    offersTitle: 'ACTIVE OFFERS',
    offersEmpty: 'No active offers right now.',
    offersEmptyMessage:
      'The franchise sends new offers here as they are published.',
    offersUnavailable: 'Offers could not be loaded.',
    viewAllOffers: 'View all offers',
  },

  shopCatalogue: {
    title: 'Catalogue',
    subtitle: (list: string) => `Prices from ${list}`,
    subtitleBase: 'Prices from the standard list',
    searchPlaceholder: 'Search cakes, pastries, supplies',
    allCategories: 'All',
    empty: 'No products match this search.',
    emptyCategory: 'Nothing in this category yet.',
    add: 'Add',
    inCart: (quantity: string) => `${quantity} in cart`,
    moq: (quantity: string, unit: string) => `Min ${quantity} ${unit}`,
    pack: (size: string) => `Packs of ${size}`,
    offerBadge: 'Offer',
    perUnit: (unit: string) => `per ${unit}`,
    added: (name: string) => `${name} added to the cart.`,
    availabilityNote:
      'A product withdrawn for tomorrow only is not flagged here — the order will say so when you submit.',
  },

  cart: {
    title: 'Tomorrow’s order',
    subtitle: (date: string) => `For delivery on ${date}`,
    empty: 'Your order is empty',
    emptyMessage:
      'Add products from the catalogue, or repeat a previous order to start from what you usually take.',
    browse: 'Browse the catalogue',

    cutoffLabel: (time: string) => `Cut-off at ${time} IST`,
    cutoffRemaining: (duration: string) => `${duration} left to submit`,
    cutoffPassed: 'Cut-off has passed. Tomorrow’s order is closed.',
    cutoffSoon: 'Cut-off is close — submit now to make tomorrow’s run.',

    repeatLast: 'Repeat last order',
    repeatWeekday: 'Repeat this weekday',
    repeatNone: 'There is no previous order to repeat yet.',
    repeated: (lines: number) =>
      `${lines} ${lines === 1 ? 'line' : 'lines'} loaded from your previous order.`,

    noteLabel: 'Note for this item',
    notePlaceholder: 'e.g. eggless, no nuts',
    orderNoteLabel: 'Note for the whole order',
    orderNotePlaceholder: 'Anything the kitchen should know',
    addNote: 'Add a note',
    editNote: 'Edit note',

    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Order total',
    taxNote: 'GST is applied by the franchise at invoicing.',
    itemsCount: (lines: number, units: string) =>
      `${lines} ${lines === 1 ? 'item' : 'items'} · ${units} units`,

    saveDraft: 'Save draft',
    draftSaved: 'Draft saved. You can keep editing until cut-off.',
    submit: 'Submit order',
    submitted: (orderId: string) => `Order ${orderId} submitted. The kitchen has it.`,
    submitTitle: 'Submit tomorrow’s order?',
    submitMessage: (value: string) =>
      `${value} will be sent to the central kitchen. You can still edit or cancel it until the cut-off.`,
    discard: 'Discard order',
    discardTitle: 'Discard this order?',
    discardMessage:
      'The draft is deleted and nothing is sent. You can start a new one before the cut-off.',
    discarded: 'Draft discarded.',

    unsaved: 'Not yet saved to the server',
    syncedAt: (time: string) => `Saved at ${time}`,
    offlineNote:
      'Your order is saved on this device. It reaches the kitchen when you submit.',

    alreadySubmitted: 'Tomorrow’s order is already submitted',
    alreadySubmittedMessage:
      'You can view it under Orders. Cancel it there if you need to place a different one before cut-off.',

    creditWarningTitle: 'Over your credit limit',
    creditWarning: (available: string) =>
      `This order takes you past your available credit of ${available}. The franchise allows it, but the balance is due.`,
    creditBlockedTitle: 'Credit limit reached',
    creditBlocked: (available: string) =>
      `Your available credit is ${available}. Settle an invoice to place this order.`,
    belowMoq: 'Some lines are below their minimum order quantity.',

    offersNote:
      'Offers on these items are applied by the franchise when the invoice is raised, so they are not deducted from this total.',
  },

  shopOrders: {
    title: 'My orders',
    subtitle: 'Everything you have ordered',
    searchPlaceholder: 'Search by order ID',
    empty: 'No orders match these filters.',
    emptyAll: 'You have not placed an order yet.',
    dateFilterUnsupported:
      'Showing all dates. Filtering orders by a date range is not supported by the server yet.',
    tabs: {
      all: 'All',
      draft: 'Draft',
      submitted: 'Submitted',
      accepted: 'Accepted',
      in_production: 'In production',
      dispatched: 'In transit',
      delivered: 'Delivered',
      invoiced: 'Invoiced',
      cancelled: 'Cancelled',
    },
    cancel: 'Cancel order',
    cancelTitle: 'Cancel this order?',
    cancelMessage:
      'The kitchen is notified that you no longer need it. This cannot be undone, and it is only possible before the cut-off.',
    cancelled: 'Order cancelled.',
    detailTitle: 'Order detail',
    progress: 'Progress',
    placedOn: 'Placed on',
    deliveryOn: 'Delivery on',
    submittedAt: 'Submitted at',
    notSubmitted: 'Not submitted yet',
    items: (count: number) => `Items (${count})`,
    ordered: 'Ordered',
    delivered: 'Delivered',
    shortSupplyNote: 'Delivered short of what was ordered.',
    viewInvoice: 'View invoice',
    editDraft: 'Edit in the cart',
    noTimeline:
      'A step-by-step history with times is not recorded by the server yet, so only the current stage is shown.',
  },

  transactions: {
    title: 'Statement',
    subtitle: 'Orders, invoices, payments and adjustments',
    searchPlaceholder: 'Search reference or description',
    typeLabel: 'Type',
    empty: 'No transactions in this range.',
    emptyFiltered: 'No transactions match this filter.',
    closingBalance: 'Closing balance',
    billed: 'Billed',
    received: 'Received',
    outstanding: 'Outstanding',
    pageFilterNote:
      'Type and text filters apply to the rows on this page only — the server filters by date alone.',
    exportUnavailable:
      'Exporting a statement to PDF or CSV is not supported by the server yet.',
    types: {
      all: 'All',
      order: 'Orders',
      invoice: 'Invoices',
      payment: 'Payments',
      credit_note: 'Credit notes',
      adjustment: 'Adjustments',
    },
  },

  invoice: {
    title: 'Invoice',
    subtitle: (number: string) => `Invoice ${number}`,
    issuedOn: 'Issued on',
    dueOn: 'Due on',
    status: 'Status',
    lines: (count: number) => `Line items (${count})`,
    quantity: 'Qty',
    unitPrice: 'Unit price',
    lineTotal: 'Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    total: 'Invoice total',
    paid: 'Paid',
    outstanding: 'Outstanding',
    basedOnDelivered:
      'Billed on the quantity actually delivered, so any shortfall is not charged.',
    basedOnOrdered: 'Billed on the quantity ordered.',
    payThis: 'Pay this invoice',
    settled: 'This invoice is settled.',
    statuses: {
      draft: 'Draft',
      issued: 'Issued',
      partially_paid: 'Partly paid',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
    },
  },

  payments: {
    title: 'Payments',
    subtitle: 'Settle your account',
    outstandingLabel: 'Total outstanding',
    availableCredit: 'Available credit',
    nothingDue: 'Nothing due',
    nothingDueMessage: 'Your account is settled. Thank you.',

    payWhat: 'What are you paying?',
    payInvoice: 'A specific invoice',
    payOutstanding: 'The full outstanding',
    payOnAccount: 'An amount on account',
    amountLabel: 'Amount',
    amountHint: 'Enter any amount up to your outstanding balance.',
    invoiceLabel: 'Invoice',
    noPayableInvoices: 'No invoices are awaiting payment.',
    dueOn: (date: string) => `Due ${date}`,
    outstandingOf: (amount: string) => `${amount} outstanding`,

    methodLabel: 'How would you like to pay?',
    methodsOnline: 'Pay now',
    methodsOffline: 'Record a payment you have already made',
    methods: {
      upi: 'UPI',
      card: 'Debit / credit card',
      netBanking: 'Net banking',
      cash: 'Cash',
      cheque: 'Cheque',
      neft: 'NEFT / bank transfer',
    },
    noteLabel: 'Reference or note',
    notePlaceholder: 'e.g. cheque number, UTR',

    pay: (amount: string) => `Pay ${amount}`,
    record: (amount: string) => `Record ${amount}`,
    confirmTitle: 'Confirm this payment?',
    confirmMessage: (amount: string, method: string) =>
      `${amount} by ${method}. Offline payments are checked by the franchise before they reach your ledger.`,

    /** FR-30 — the offline flow, which works end to end today. */
    recorded: 'Payment recorded. The franchise will confirm it.',
    awaitingTitle: 'Awaiting confirmation',
    awaitingMessage: (reference: string) =>
      `Recorded as ${reference}. It appears on your ledger once the franchise confirms it, and you will be notified either way.`,

    /** FR-28 — an online rail with no gateway wired. Stated, never faked. */
    gatewayUnavailableTitle: 'Online payment is not connected yet',
    gatewayUnavailableMessage: (reference: string) =>
      `Your request was recorded as ${reference}, but no payment gateway is connected, so nothing has been charged and the amount is still due. Use cash, cheque or NEFT and record it here, or contact the franchise.`,
    gatewayHandoff: 'Opening secure checkout...',

    historyTitle: 'Payment history',
    historyEmpty: 'No payments recorded yet.',
    statuses: {
      pending: 'Pending',
      success: 'Successful',
      failed: 'Failed',
      pendingConfirmation: 'Awaiting confirmation',
      rejected: 'Rejected',
      refunded: 'Refunded',
    },
    errors: {
      amount: 'Enter an amount greater than zero.',
      overOutstanding: 'That is more than your outstanding balance.',
      method: 'Choose how you are paying.',
    },
  },

  offers: {
    title: 'Offers',
    subtitle: 'From the franchise',
    activeTitle: 'Live now',
    scheduledTitle: 'Coming up',
    empty: 'No offers right now.',
    emptyMessage: 'The franchise will send new offers here as they are published.',
    validUntil: (date: string) => `Valid until ${date}`,
    startsOn: (date: string) => `Starts ${date}`,
    allProducts: 'On the whole catalogue',
    someProducts: (count: number) =>
      `On ${count} ${count === 1 ? 'product' : 'products'}`,
    discount: {
      percentage: (value: string) => `${value}% off`,
      flat: (value: string) => `${value} off`,
      buyXGetY: (buy: number, get: number) => `Buy ${buy}, get ${get}`,
    },
    /** FR-34 — the half of the requirement the backend cannot honour. */
    notAutoApplied:
      'Offers are applied by the franchise when your invoice is raised, so they do not change your order total here.',
  },

  notifications: {
    title: 'Notifications',
    empty: 'Nothing to catch up on.',
    emptyMessage: 'Cut-off reminders, order updates and payment alerts appear here.',
    markAllRead: 'Mark all as read',
    allRead: 'All notifications marked as read.',
    unread: (count: number) => `${count} unread`,
    settingsTitle: 'What you are notified about',
    settingsSubtitle: 'Cut-off and money alerts always stay on.',
    cannotMute: 'Cut-off and financial alerts cannot be turned off.',
    alwaysOn: 'Always on',
    /** FR-43 — the delivery half that is not wired anywhere yet. */
    pushUnavailable:
      'These appear when you open the app. Push and SMS delivery are not connected yet.',
    categories: {
      cutoff: 'Cut-off',
      order: 'Orders',
      financial: 'Billing and payments',
      offer: 'Offers',
    },
    types: {
      cutoffReminder: 'Cut-off reminder',
      orderSubmitted: 'Order submitted',
      orderAccepted: 'Order accepted',
      orderInProduction: 'Order in production',
      orderDispatched: 'Order dispatched',
      orderDelivered: 'Order delivered',
      invoiceGenerated: 'Invoice generated',
      paymentSuccess: 'Payment received',
      paymentFailed: 'Payment failed',
      paymentOverdue: 'Payment overdue',
      newOffer: 'New offer',
      creditLimitWarning: 'Credit limit reached',
    },
  },

  /** The More tab — everything that is not the daily ordering job. */
  shopMore: {
    title: 'More',
    sectionShop: 'Your shop',
    sectionOrdering: 'Ordering',
    sectionAccount: 'Account',
    catalogue: 'Browse catalogue',
    catalogueCaption: 'Products and your prices',
    offers: 'Offers',
    offersCaption: 'What the franchise is running',
    notifications: 'Notifications',
    notificationsCaption: (count: number) =>
      count > 0 ? `${count} unread` : 'Cut-off, order and payment alerts',
    notificationSettings: 'Notification settings',
    payments: 'Pay a bill',
    paymentsCaption: 'Settle an invoice or your outstanding',
  },

  shopAccount: {
    title: 'Account',
    profile: 'Profile',
    signedInWith: 'Signed in with',
    role: 'Shop owner',
    outlets: 'Your outlets',
    outletsSubtitle: 'Switch which outlet you are ordering for.',
    currentOutlet: 'Currently ordering for',
    notifications: 'Notification settings',
    creditTitle: 'Credit',
    creditUsed: (used: string, limit: string) => `${used} of ${limit} used`,
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutMessage:
      'Any draft order saved on this device stays on it, but you will need to sign in again to submit it.',
    version: 'CakeConnect',
  },

  placeholder: {
    comingSoon: 'Coming soon',
    body: 'This screen is part of the next admin batch.',
  },
} as const;

export default strings;
