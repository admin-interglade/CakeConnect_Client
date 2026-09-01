# CakeConnect Project Context

## 1. Project Overview

### What is CakeConnect?
CakeConnect is a single mobile app for a cake-shop franchise network. It replaces the phone-call-and-WhatsApp ordering flow currently used by shops and gives the franchise owner a centralized place to manage the network, approve shops, publish offers, track orders, and collect payments.

The app is designed to streamline next-day demand submission, production planning, and collections across the network.

### Users and roles

#### Franchise Owner (Admin)
- Owns the brand and central kitchen.
- Manages shops, catalogue, pricing, offers, fulfilment, and collections.
- Has full network visibility and admin controls.

#### Franchise Shop Owner
- Runs a single outlet.
- Places daily demand, tracks their own orders, views their dashboard, manages ledger activity, and pays invoices.
- Sees only their own data and outlet-specific information.

### MVP scope
The MVP focuses on the core flow required to replace manual WhatsApp ordering and spreadsheet-based reconciliation:
- Authentication and role-based access
- Shop management and onboarding
- Product catalogue and pricing
- Next-day order submission with cut-off enforcement
- Order tracking and dashboard views
- Payment collection and ledger updates
- Offer visibility and basic notifications
- Basic offline functionality for cart and draft orders

---

## 2. Key Features (Phase 1)

### User authentication (OTP login)
- Mobile-number login with OTP verification.
- Optional PIN or biometric unlock for subsequent app launches.
- Role-based access to admin or shop data.

### View product catalogue
- Browse products and categories.
- View pricing relevant to the logged-in shop.
- Check product availability and unit information.

### Build and submit daily order
- Add products to an order cart.
- Use quantity steppers and per-item notes.
- See running order value including tax.
- Submit next-day demand before the configured cut-off.

### Order history and tracking
- View submitted orders and order status.
- Track order lifecycle from draft/submitted to accepted, dispatched, delivered, and invoiced.
- Review past order history by date range.

### Payment (Razorpay)
- Pay invoices or outstanding amounts through Razorpay.
- Process payments securely with the payment gateway.
- Update ledger and outstanding balances once successful.

### Offline support
- Build and save cart drafts even without internet.
- Cache catalogue and recent order data locally.
- Automatically sync queued or draft orders when connectivity is restored.

---

## 3. Tech Stack Reference

### React Native
Use a React Native app with a bare workflow (not Expo), to allow better control over native modules, payment providers, offline storage, and app-level integrations.

### Navigation
- React Navigation
- Stack, tab, and drawer flows as needed for admin and shop flows

### State management
- Redux Toolkit for app-wide state
- Redux Persist for persisting state across sessions

### API layer
- Axios for HTTP requests
- Base API domain: https://api.cakeconnect.com

### Payments
- Razorpay React Native SDK
- Secure gateway integration without storing card data locally or on backend servers

### Storage
- AsyncStorage for lightweight local persistence
- SQLite for structured local data and offline order records

### UI libraries
- Native Base or React Native Paper
- Mobile-first UI with accessibility-aware touch targets and readable layouts

---

## 4. Architecture Overview

### API and backend access
- Base endpoint: https://api.cakeconnect.com
- JWT-based authentication for session management
- OTP-based login flow for initial authentication

### Auth model
- User logs in using mobile number and OTP.
- JWT tokens are used for authenticated API calls.
- Session expiry and secure token handling are required.

### Offline architecture
- Draft orders are saved locally in AsyncStorage.
- Cached data allows shops to continue working in low-connectivity situations.
- Offline cart data persists across app restarts.

### Sync strategy
- When the device reconnects, queued and draft orders are synced automatically.
- Sync logic should retry failed requests and resolve local-to-server conflicts safely.
- Orders must not be lost during connectivity interruptions.

---

## 5. Development Standards

### TypeScript
- Use TypeScript throughout the application.
- Prefer typed models, interfaces, and reducer states.
- Keep business logic explicit and maintainable.

### React and functional patterns
- Build components as functional components.
- Use React Hooks for state, effects, and lifecycle patterns.
- Keep components modular and reusable.

### Redux architecture
- Use Redux for global state such as auth, shops, catalog, orders, and payments.
- Keep reducer logic predictable and centralized.
- Persist essential app state with Redux Persist where appropriate.

### Server state and data fetching
- Use TanStack Query for asynchronous server state and API caching.
- Manage background refetching, loading states, and retry logic centrally.

### Error handling and resilience
- Implement retry logic for transient network failures.
- Show user-friendly error states for failed API calls.
- Handle offline mode gracefully without breaking the ordering experience.

### Accessibility
- Minimum touch targets of 44×44 points.
- Ensure readable typography, good contrast, and accessible interactions.
- Support dynamic type and accessibility-friendly input layout.

---

## 6. Critical Business Logic

### Cut-off timer
- The app must display a countdown to the order submission deadline.
- The cut-off defines when next-day ordering is locked.
- Orders submitted after the cut-off should not be accepted unless there is an admin exception.

### Credit limit enforcement
- The system must prevent ordering when a shop exceeds its approved credit limit.
- The app should surface warnings or block actions before submission if the limit is exceeded.

### Offline support
- Users should be able to build a cart without internet access.
- Offline cart state must be saved and restored after restart.
- The user should continue ordering even if the network is temporarily unavailable.

### Auto-sync behavior
- Once the device is online again, draft orders and pending changes should sync automatically.
- Sync should happen in the background when connectivity is restored.
- The app should avoid duplicate submissions or inconsistent local state.

---

## 7. Implementation Guidance

### Recommended app structure
- Authentication and route guard logic
- Shop-specific dashboards and screens
- Shared catalogue and order modules
- Payment and ledger components
- Notifications and offers modules
- Offline persistence and sync service layer

### Suggested integrations
- JWT handling in API interceptors
- Redux slices for auth, carts, orders, payments, and offers
- TanStack Query hooks for server data fetching and cache management
- Background sync service for offline order queue processing
- Razorpay payment flow integrated into checkout and payment screens

### Product mindset
This project is operational and business-critical. Prioritize reliability, clear user flows, offline resilience, and correct business-rule enforcement over purely aesthetic UX.

---

## 8. Summary
CakeConnect is a franchise order-management and payment platform for cake shops. The MVP focuses on simplifying daily demand entry, centralizing order tracking, and enabling payment reconciliation with strong offline and cut-off handling.

The application should be built using React Native in a bare workflow, with React Navigation, Redux Toolkit + Redux Persist, Axios, TanStack Query, AsyncStorage, SQLite, and Razorpay, while following TypeScript-first, accessibility-conscious development standards.
