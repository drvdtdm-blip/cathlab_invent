# Cath Lab Inventory Management Web App

A dense, desktop-first, highly-auditable inventory tracking and PMJAY cost-control tool for cardiology department catheterization laboratories. Built as an offline-first Single-Page Application (SPA).

---

## Technical Stack
- **Frontend Framework**: React 18 + Vite (SPA)
- **Programming Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database/Persistence**: IndexedDB via `Dexie.js` (Offline-first, survives page refreshes and browser closures).

---

## Local Setup & Run

### Prerequisites
Make sure you have Node.js (version 18 or above) and npm installed.

### 1. Install Dependencies
In the project directory, run:
```bash
npm install
```

### 2. Run the Development Server
Launch the local application:
```bash
npm run dev
```
Open the URL shown in your terminal (usually `http://localhost:5173`) in your web browser.

### 3. Build for Production
Compiles and bundles the application for static hosting:
```bash
npm run build
```
The output bundle will be placed in the `dist/` directory, which can be deployed to static hosting solutions (GitHub Pages, Netlify, Vercel, or local hospital intranets).

---

## Core Data Model Schema

The local database `CathLabInventoryDB` is structured around five primary tables:

1. **Items (`db.items`)**
   - Stores catalog item specs (name, manufacturer, category, dimensions/model size), batch numbers, expiry dates, costs, locations, and active quantities.

2. **Procedures (`db.procedures`)**
   - Stores logs of cardiac procedures. Links cases to billing packages, calculates total consumable cost, flags ceiling budget compliance, and records justifications for over-ceiling usages.

3. **PMJAY Packages (`db.pmjayPackages`)**
   - Configures maximum billing ceilings and links to default anticipated consumable items (templates) for PCI, PPI, BMV, and device closures.

4. **Requisitions (`db.requisitions`)**
   - Logs stock ordering lists. Moves from `draft` -> `submitted` -> `received`.

5. **Ledger (`db.ledger`)**
   - Immutable transaction ledger. Every stock level change logs a ledger entry recording the delta, final count, operator name, reference link, and textual audit reason.

---

## Future Migration: Swapping IndexedDB for a Serverless API

To scale this application from a single shared lab desktop to a multi-user networked environment (with a serverless API backend, e.g. Node.js on AWS Lambda, Vercel Serverless, Supabase, or Firebase) without rewriting components:

### 1. Extract the Database Interface
Create a service layer (e.g. `src/services/inventoryService.ts`) to isolate database calls:
```typescript
// Current Dexie Call:
export const getInventoryItems = () => db.items.toArray();

// Future Serverless Fetch Call:
export const getInventoryItems = () => 
  fetch('/api/inventory').then(res => res.json());
```

### 2. Replace Reactive Queries with React Query / SWR
Currently, components watch IndexedDB changes using Dexie's reactive `useLiveQuery` hook:
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
const items = useLiveQuery(() => db.items.toArray()) || [];
```
To transition to serverless REST/GraphQL endpoints, replace `useLiveQuery` with a query manager like **TanStack React Query** or **SWR** to manage network caching, loading states, and automatic background refetching:
```typescript
import { useQuery } from '@tanstack/react-query';
const { data: items = [], isLoading } = useQuery({ 
  queryKey: ['items'], 
  queryFn: getInventoryItems 
});
```

### 3. Implement Transactions via API Endpoints
Critical actions (like logging a case which decrements stock and writes ledger logs) currently run in local Dexie database transactions:
```typescript
await db.transaction('rw', [db.items, db.procedures, db.ledger], async () => { ... });
```
In a multi-user environment, move this transaction logic to the backend database layer (e.g., PostgreSQL transactions or DynamoDB TransactWriteItems) to prevent **race conditions** (two scrub nurses trying to consume the same guide catheter simultaneously). The frontend will simply call a single atomic endpoint:
```typescript
// Frontend sends single request:
await fetch('/api/procedures', {
  method: 'POST',
  body: JSON.stringify(procedureData)
});
```
The backend API receives the payload, executes the transaction, checks for stock availability, deducts stock, writes the ledger trail, and returns a success response.
