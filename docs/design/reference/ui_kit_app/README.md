# Personal Finance Manager — UI Kit

Interactive click-through recreation of the app's core screens, built from the written prototype brief (no source codebase was available — see root `readme.md` for details).

Open `index.html`: sign in with any values to land on the Dashboard, then use the sidebar (desktop, ≥768px) or the top-bar menu (mobile, <768px) to move between Dashboard, Transactions, Categories, Recurring, and Settings.

## Screens

- **Auth** (`Auth.jsx`) — centered card, Sign in / Sign up toggle.
- **Dashboard** (`Dashboard.jsx`) — Week/Month/Year tabs, three summary figures (Income/Expense/Savings), recent-transactions table.
- **Transactions** (`Transactions.jsx`) — filter bar (Type/Category/Date range), table with row actions, "New transaction" dialog.
- **Categories** (`Categories.jsx`) — table with row actions; click Delete on "Market" to see the delete-blocked inline error state.
- **Recurring** (`Recurring.jsx`) — table with Active/Paused badge and pause/resume action, "New recurring transaction" dialog.
- **Settings** (`Settings.jsx`) — single base-currency field + Save.
- **NavShell** (`NavShell.jsx`) — shared chrome: left sidebar (desktop) collapsing to a top bar + drawer (mobile).

All screens compose the design system's primitives (`Button`, `Input`, `Select`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`) from `window.<Namespace>` — see root `readme.md` for the namespace name.
