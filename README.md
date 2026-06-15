<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=40&pause=1000&color=1A56DB&center=true&vCenter=true&width=800&height=80&lines=Taurus+Trade+%26+Logistics+ERP;Enterprise+Fleet+%26+Finance+System;Multi-Branch+%7C+Role-Based+%7C+Real-Time" alt="Typing SVG" />

<br/>

[![Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Railway](https://img.shields.io/badge/Deployed-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)

<br/>

> **A production-grade, multi-branch Logistics ERP system** — managing fleet, fuel, inventory, trips, invoicing, finance, and reporting across multiple branches with full data isolation and role-based access control.

<br/>

```
🚛 Fleet Management    ⛽ Fuel Control      📦 Inventory Ledger
💰 Invoicing & Finance  📊 Live Reports      🔐 Multi-Branch RBAC
```

</div>

---
👨‍💻 Built By

<div align="center">
Show Image
Show Image

</div>

## Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🧰 Tech Stack](#-tech-stack)
- [👥 Role-Based Access Control](#-role-based-access-control)
- [🏢 Multi-Branch System](#-multi-branch-system)
- [💱 Currency Configuration](#-currency-configuration)
- [📐 Auto-Calculation Engine](#-auto-calculation-engine)
- [📡 API Reference](#-api-reference)
- [🗄️ Stock Ledger Rules](#️-stock-ledger-rules)
- [📊 Reports & Exports](#-reports--exports)
- [🚀 Local Setup](#-local-setup)
- [🌐 Environment Variables](#-environment-variables)
- [📁 Project Structure](#-project-structure)
- [🔐 Security](#-security)

---

## Features

<table>
<tr>
<td width="50%">

### Fleet & Operations
- **Truck Management** — Full lifecycle with document expiry alerts (VIT, Road Worthy, Insurance, DVLA)
- **Driver Records** — Licence tracking, expiry warnings, truck assignments
- **Trip Management** — Loading/delivery quantities, revenue auto-calculation, duration tracking
- **Fuel Control** — Per-truck fuel limits, excess detection, cost calculation
- **Tyre Lifecycle** — Fit/remove tracking, km-used calculation, brand & position management
- **Maintenance Logs** — Labour + parts cost tracking per truck

</td>
<td width="50%">

### Finance & Inventory
- **Invoicing** — Professional PDF invoices with line items, VAT, payment tracking
- **Revenue Tracking** — Multi-source (Trip, Haulage, Invoice-linked, Custom)
- **Expenditure** — Categorised expense logging per truck/branch
- **Purchase Management** — VAT-inclusive purchase orders with stock auto-update
- **Stock Ledger** — Double-entry inventory system (never static fields)
- **Issue Tracking** — Block issues when stock is insufficient

</td>
</tr>
<tr>
<td width="50%">

### Reporting & Exports
- **Live Dashboard** — KPIs, expiry alerts, month-at-a-glance
- **10+ Report Types** — Revenue/Expenditure, Fuel, Trips, Stock, VAT, Tyres, Maintenance
- **Excel Export** — Branded, styled, auto-sized with frozen headers
- **PDF Export** — Professional layout for invoices and reports
- **Audit Log** — Every create/update/delete tracked with user, IP, timestamp

</td>
<td width="50%">

### Access & Security
- **Multi-Branch Isolation** — Complete data separation between branches
- **4-Tier RBAC** — Super Admin → Admin → Manager → Employee
- **JWT Authentication** — 8h access token, 7d refresh, blacklist on logout
- **Branch-Scoped APIs** — Backend enforces isolation at queryset level
- **Module Permissions** — Granular per-module access for Managers/Employees
- **Security Logging** — Suspicious 401/403 activity logged automatically

</td>
</tr>
</table>

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND                           │
│   Dashboard │ Fleet │ Inventory │ Finance │ Reports │ Users     │
│                   JWT Bearer Token Auth                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS / REST API
┌─────────────────────▼───────────────────────────────────────────┐
│                    DJANGO REST FRAMEWORK                        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Users   │  │  Fleet   │  │Inventory │  │   Finance    │   │
│  │  + RBAC  │  │Trucks/   │  │Purchase/ │  │Revenue/Expd/ │   │
│  │  Branch  │  │Drivers/  │  │Issue/    │  │Invoicing/    │   │
│  │  Scoping │  │Trips/    │  │Stock/    │  │Reports       │   │
│  └──────────┘  │Fuel/     │  │Tyres     │  └──────────────┘   │
│                │Tyres/    │  └──────────┘                      │
│                │Maint.    │                                     │
│                └──────────┘                                     │
│            BranchScopedQuerysetMixin (all models)               │
│            AuditLogMiddleware (all mutations)                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                       MySQL 8.0                                 │
│    FK-enforced │ Soft-delete │ Indexed │ Branch-partitioned     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Python 3.11, Django 4.2, DRF 3.14 | REST API, business logic |
| **Database** | MySQL 8.0 | Relational data, FK-enforced |
| **Auth** | JWT (SimpleJWT) | Stateless auth, token blacklist |
| **Frontend** | React 18, React Hook Form | SPA, real-time form calculations |
| **Charts** | Recharts | Dashboard visualisations |
| **PDF Export** | ReportLab | Invoice & report PDFs |
| **Excel Export** | OpenPyXL | Styled, branded Excel exports |
| **Deployment** | Railway | Backend + Frontend + MySQL |
| **Styling** | Custom CSS Design System | Variables, dark mode, responsive |

---

## Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────┐
│  SUPER ADMIN                                                │
│  • Full access to ALL branches                              │
│  • Branch switcher in topbar                                │
│  • Can create/manage Admins in any branch                   │
│  • View consolidated or per-branch data                     │
├─────────────────────────────────────────────────────────────┤
│  ADMIN  (per branch)                                        │
│  • Full access within their assigned branch ONLY            │
│  • Can create Managers and Employees in their branch        │
│  • Cannot view or modify data from other branches           │
│  • Cannot promote users to Admin or Super Admin             │
├─────────────────────────────────────────────────────────────┤
│  MANAGER  (per branch)                                      │
│  • Access controlled by module permissions set by Admin     │
│  • Read + write within permitted modules only               │
│  • Cannot access Users management page                      │
├─────────────────────────────────────────────────────────────┤
│  EMPLOYEE  (per branch)                                     │
│  • Restricted access, typically read-only                   │
│  • Module permissions set by Admin                          │
│  • Can only edit their own profile                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Branch System

Every model in the system has a `branch` ForeignKey. The `BranchScopedQuerysetMixin` is applied to **all** ViewSets and enforces isolation at the database queryset level — not just the UI.

```python
# Example: How branch isolation works at the API level
class TruckListCreate(BranchScopedQuerysetMixin, generics.ListCreateAPIView):
    queryset = Truck.objects.all()
    # Super Admin + ?branch_id=2  → only Branch 2 trucks
    # Admin (Branch 1)            → only Branch 1 trucks, always
    # Admin (Branch 2)            → only Branch 2 trucks, always
```

**Frontend branch switching (Super Admin only):**
```
Topbar → BRANCH dropdown → Select Branch 1 / Branch 2 / All Branches
→ All API calls automatically include ?branch_id=N
→ Currency symbol updates to match branch
→ Dashboard, Fleet, Inventory, Finance all reload for selected branch
```

---

## Currency Configuration

Each branch has its own currency configured in the database:

| Branch | Currency | Symbol | Code |
|--------|----------|--------|------|
| Branch 1 | Ghana Cedis | `GH₵` | `GHS` |
| Branch 2 | Sierra Leone Leone | `Le` | `SLL` |

Currency is **backend-driven** — set per branch in the `branches` table and returned with every API response. The frontend automatically switches currency symbol when branch changes.

```sql
-- Set branch currency
UPDATE branches SET currency = 'SLL' WHERE id = 2;  -- Sierra Leone Leone
UPDATE branches SET currency = 'GHS' WHERE id = 1;  -- Ghana Cedis
```

---

## Auto-Calculation Engine

Every form field auto-calculates in real time with zero manual entry:

| Form | Input Fields | Auto-Calculated |
|------|-------------|----------------|
| **Purchase** | qty × unit_price | `base_amount`, `vat_amount`, `final_amount` |
| **Issue** | qty × last_unit_price | `total_value`, stock validation (blocks if insufficient) |
| **Fuel Log** | litres − fuel_limit | `excess_fuel` (remark required if > 0), `total_cost` |
| **Trip** | loaded_qty − delivered_qty | `qty_difference`, `trip_revenue`, `trip_duration` |
| **Invoice Line** | qty × unit_price | `line_total`, `subtotal`, `vat_amount`, `total_amount` |
| **Maintenance** | labour_cost + parts_cost | `total_cost` |
| **VIT** | last_paid_date + 90 days | `next_due_date` |
| **Tyre Removal** | odometer_remove − odometer_fit | `km_used` |

---

## API Reference

### Authentication
```
POST   /api/auth/login/          → { access, refresh, user }
POST   /api/auth/logout/         → blacklists refresh token
POST   /api/auth/refresh/        → { access }
GET    /api/auth/me/             → current user profile
```

### Fleet
```
GET/POST   /api/trucks/              → list / create trucks
GET        /api/trucks/alerts/       → expiry alerts (branch-scoped)
GET/POST   /api/drivers/             → list / create drivers
GET/POST   /api/trips/               → list / create trips
POST       /api/trips/preview/       → calculate without saving
GET/POST   /api/fuel/logs/           → list / log fuel fills
POST       /api/fuel/preview/        → preview fuel calculation
GET/POST   /api/tyres/               → list / create tyres
POST       /api/tyres/assign/        → fit tyre to truck
POST       /api/tyres/swap/          → swap tyres between trucks
GET/POST   /api/maintenance/logs/    → list / create maintenance records
```

### Inventory
```
GET/POST   /api/inventory/items/            → stock items
GET/POST   /api/inventory/purchases/        → purchase orders
POST       /api/inventory/purchases/preview/→ preview without saving
GET/POST   /api/inventory/issues/           → issue items
GET        /api/inventory/ledger/           → full stock ledger
GET        /api/inventory/closing-stock/    → current stock levels
GET        /api/inventory/available-stock/  → available qty per item
```

### Finance
```
GET/POST   /api/finance/revenue/            → revenue records
GET/POST   /api/finance/expenditure/        → expenditure records
GET/POST   /api/invoicing/invoices/         → invoices
GET        /api/invoicing/invoices/{id}/pdf/→ download PDF
```

### Reports _(all accept `?date_from=&date_to=&format=json|pdf|excel&branch_id=`)_
```
GET   /api/reports/dashboard/             → KPI summary
GET   /api/reports/revenue-expenditure/   → P&L report
GET   /api/reports/fuel/                  → fuel consumption report
GET   /api/reports/trips/                 → trip analysis
GET   /api/reports/stock/                 → stock report
GET   /api/reports/invoice/               → invoice summary
GET   /api/reports/maintenance/           → maintenance report
GET   /api/reports/tyres/                 → tyre report
GET   /api/reports/vat/                   → VAT report
GET   /api/reports/lubricants/            → lubricant usage
```

---

## Stock Ledger Rules

> ⚠️ Stock is **never** stored as a static field. It is always computed from ledger entries.

```
closing_qty   = SUM(quantity)      FROM stock_ledger WHERE item = X
closing_value = SUM(final_amount)  FROM stock_ledger WHERE item = X

Inward  (+): OPENING, PURCHASE, TRANSFER_IN
Outward (−): ISSUE, TRANSFER_OUT

Issue blocked at API level if: available_qty < requested_qty
```

**VAT Calculation:**
```
base_amount  = quantity × unit_price
vat_amount   = base_amount × (vat_pct / 100)   [if vat_applicable = true]
final_amount = base_amount + vat_amount
```

---

## 📊 Reports & Exports

### Excel Export Format
All Excel exports are fully branded:

| Row | Content |
|-----|---------|
| 1 | Navy company banner |
| 2 | Report title (blue) |
| 3 | Generation date & filters |
| 5 | Sky-blue column headers (bold, frozen) |
| 6+ | Data rows (alternating backgrounds) |
| Last | Navy summary totals row |

### Document Expiry Alerts
Trucks track multiple document expiry dates. The dashboard shows alerts at:
- 🔴 **Danger** — Already expired or < 0 days
- 🟠 **Warning** — Expiring within 30 days
- 🟡 **Caution** — Expiring within 60 days

Document types tracked: `VIT`, `Road Worthy`, `Insurance`, `DVLA`, `Fire Extinguisher`, `First Aid Kit`

---

## Local Setup

### Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create MySQL database
mysql -u root -p
CREATE DATABASE taurus_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 4. Configure environment
cp .env.example .env
# Edit .env with your DB credentials

# 5. Apply migrations
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser

# 7. Run dev server
python manage.py runserver
# → API available at http://localhost:8000/api/
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
# → App available at http://localhost:3000
```

### Database (Raw SQL — skip migrations)

```sql
-- Add currency to branches (if running raw SQL)
ALTER TABLE branches ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'GHS';
UPDATE branches SET currency = 'SLL' WHERE id = 2;

-- Register migration
INSERT INTO django_migrations (app, name, applied)
VALUES ('users', '0005_branch_currency', NOW());
```

---

## 🌐 Environment Variables

```ini
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.railway.app,localhost

# Database
DB_NAME=taurus_erp
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=127.0.0.1
DB_PORT=3306

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app,http://localhost:3000

# Frontend
REACT_APP_API_URL=https://your-backend.railway.app/api
```

---

## Project Structure

```
Taurus-logistics/
│
├── backend/
│   ├── config/
│   │   ├── settings.py          # Django settings
│   │   ├── urls.py              # Root URL config
│   │   └── wsgi.py
│   │
│   ├── apps/
│   │   ├── core/
│   │   │   ├── models.py        # TimeStamped, SoftDelete, AuditLog, SystemAlert
│   │   │   ├── branch_mixin.py  # BranchScopedQuerysetMixin (all views)
│   │   │   └── middleware.py    # AuditLogMiddleware
│   │   │
│   │   ├── users/
│   │   │   ├── models.py        # Branch, User (RBAC + branch FK)
│   │   │   ├── serializers.py   # UserSerializer with branch_currency
│   │   │   └── views.py         # Login, Users CRUD, Branch management
│   │   │
│   │   ├── trucks/              # Fleet: Truck, TruckDocument, expiry_alerts()
│   │   ├── drivers/             # Driver records + licence tracking
│   │   ├── trips/               # Trip management + preview endpoint
│   │   ├── fuel/                # FuelLog, FuelLimit, excess detection
│   │   ├── tyres/               # Tyre lifecycle: fit, remove, swap, km_used
│   │   ├── maintenance/         # Service logs per truck
│   │   ├── inventory/           # Item, StockLedger, Purchase, IssueItem
│   │   ├── finance/             # Revenue, Expenditure
│   │   ├── invoicing/           # Invoice, InvoiceLine, PDF export
│   │   └── reports/             # Dashboard + 10 report types + Excel/PDF
│   │
│   └── requirements.txt
│
└── frontend/
    ├── public/
    │   └── index.html
    │
    └── src/
        ├── App.jsx              # Router, Auth, BranchProvider, CurrencyContext
        ├── index.jsx
        │
        ├── pages/
        │   ├── Dashboard.jsx    # KPIs, expiry alerts, month summary
        │   ├── Trucks.jsx       # Fleet management
        │   ├── Drivers.jsx      # Driver management
        │   ├── Trips.jsx        # Trip logging
        │   ├── Fuel.jsx         # Fuel control
        │   ├── Tyres.jsx        # Tyre lifecycle
        │   ├── Maintenance.jsx  # Service records
        │   ├── Purchase.jsx     # Stock purchases
        │   ├── Issue.jsx        # Stock issues
        │   ├── Stock.jsx        # Stock ledger view
        │   ├── Invoicing.jsx    # Invoice management + PDF
        │   ├── Expenditure.jsx  # Expense tracking
        │   ├── Revenue.jsx      # Revenue records
        │   ├── Reports.jsx      # All reports + exports
        │   ├── Users.jsx        # User management (Admin+)
        │   ├── AuditLog.jsx     # Activity audit trail
        │   └── Profile.jsx      # User profile + password change
        │
        ├── utils/
        │   ├── api.js           # Axios + JWT refresh + currency + calculators
        │   └── BranchContext.js # Re-exports useBranch, useCurrency
        │
        └── styles/
            └── main.css         # Full design system: variables, dark mode, components
```

---

## Security

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT with 8h access / 7d refresh tokens |
| **Token Blacklist** | Refresh tokens blacklisted on logout |
| **Branch Isolation** | Enforced at Django queryset level (not just UI) |
| **Role Enforcement** | Permission classes on every API view |
| **Audit Trail** | Every mutating API call logged with user, IP, endpoint |
| **Sensitive Field Masking** | Passwords, tokens masked in audit logs |
| **Rate Limiting** | Login endpoint throttled (10 req/min) |
| **Security Logging** | 401/403 patterns logged to security logger |
| **CORS** | Strict origin whitelist |
| **SQL Injection** | Django ORM + parameterised queries only |

---

<div align="center">

<br/>

**Built for logistics operations across multiple branches**

<br/>

![Django](https://img.shields.io/badge/Django-REST_Framework-092E20?style=flat-square&logo=django)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Railway](https://img.shields.io/badge/Hosted_on-Railway-0B0D0E?style=flat-square&logo=railway)

</div>
