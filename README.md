<!-- ═══════════════════════════════════════════════════════════════════════
     TAURUS TRADE & LOGISTICS ERP — README
     NOTE: replace every  YOUR_GITHUB_USER/Taurus-logistics  with your real repo path
     ═══════════════════════════════════════════════════════════════════════ -->

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,18,24&height=260&section=header&text=TAURUS%20ERP&fontSize=84&fontColor=ffffff&animation=fadeIn&fontAlignY=36&desc=Trade%20%26%20Logistics%20Enterprise%20Resource%20Planning&descSize=22&descAlignY=58&descAlign=50" width="100%" alt="Taurus ERP header" />

<a href="https://git.io/typing-svg">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=24&duration=3000&pause=900&color=1A56DB&center=true&vCenter=true&multiline=false&width=900&height=60&lines=Production-grade+Multi-Branch+Logistics+ERP;Fleet+%7C+Fuel+%7C+Inventory+%7C+Finance+%7C+Reports;Django+REST+%2B+React+18+%2B+MySQL+8;4-Tier+RBAC+with+Database-Level+Branch+Isolation;Double-Entry+Stock+Ledger+%7C+Audit+Trail+%7C+JWT" alt="Typing animation" />
</a>

<br/>

[![Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.14-A30000?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Railway](https://img.shields.io/badge/Deployed-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)

![Status](https://img.shields.io/badge/status-production-success?style=flat-square&logo=statuspage&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![Branches](https://img.shields.io/badge/multi--branch-ready-orange?style=flat-square)
![RBAC](https://img.shields.io/badge/RBAC-4%20tiers-critical?style=flat-square)
![Reports](https://img.shields.io/badge/reports-10%2B-blueviolet?style=flat-square)
![Exports](https://img.shields.io/badge/exports-PDF%20%7C%20Excel-informational?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![Made with Love](https://img.shields.io/badge/made%20with-%E2%9D%A4-red?style=flat-square)

<br/>

> ### 🚛 A production-grade, multi-branch Logistics ERP
> Manage **fleet, fuel, inventory, trips, invoicing, finance and reporting** across multiple branches — with **full data isolation** and **role-based access control** enforced at the database queryset level.

<br/>

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="700" alt="divider" />

<br/>

| 🚛 Fleet Management | ⛽ Fuel Control | 📦 Inventory Ledger |
|:---:|:---:|:---:|
| Trucks · Drivers · Trips · Tyres | Per-truck limits · Excess detection | Double-entry · Never a static field |
| **💰 Invoicing & Finance** | **📊 Live Reports** | **🔐 Multi-Branch RBAC** |
| PDF invoices · VAT · Payments | 10+ reports · PDF/Excel | 4 tiers · Branch-scoped APIs |

<br/>

[**✨ Features**](#-features) ·
[**🏗️ Architecture**](#️-architecture) ·
[**🚀 Quick Start**](#-quick-start) ·
[**📡 API**](#-api-reference) ·
[**🔐 Security**](#-security) ·
[**🗺️ Roadmap**](#️-roadmap)

</div>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 📑 Table of Contents

<details open>
<summary><b>Click to expand / collapse</b></summary>
<br/>

1. [✨ Features](#-features)
2. [📸 Screenshots](#-screenshots)
3. [🏗️ Architecture](#️-architecture)
4. [🧰 Tech Stack](#-tech-stack)
5. [👥 Role-Based Access Control](#-role-based-access-control)
6. [🏢 Multi-Branch System](#-multi-branch-system)
7. [💱 Currency Configuration](#-currency-configuration)
8. [📐 Auto-Calculation Engine](#-auto-calculation-engine)
9. [🗄️ Data Model](#️-data-model)
10. [🗄️ Stock Ledger Rules](#️-stock-ledger-rules)
11. [🔄 Key Workflows](#-key-workflows)
12. [📡 API Reference](#-api-reference)
13. [📊 Reports & Exports](#-reports--exports)
14. [🚀 Quick Start](#-quick-start)
15. [🌐 Environment Variables](#-environment-variables)
16. [☁️ Deployment (Railway)](#️-deployment-railway)
17. [📁 Project Structure](#-project-structure)
18. [🔐 Security](#-security)
19. [🧪 Testing](#-testing)
20. [🗺️ Roadmap](#️-roadmap)
21. [🤝 Contributing](#-contributing)
22. [❓ FAQ](#-faq)
23. [👨‍💻 Built By](#-built-by)
24. [📜 License](#-license)

</details>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🚛 Fleet & Operations
- **Truck Management** — Full lifecycle with document expiry alerts (VIT, Road Worthy, Insurance, DVLA)
- **Driver Records** — Licence tracking, expiry warnings, truck assignments
- **Trip Management** — Loading/delivery quantities, revenue auto-calculation, duration tracking
- **Fuel Control** — Per-truck fuel limits, excess detection, cost calculation
- **Tyre Lifecycle** — Fit/remove/swap tracking, km-used calculation, brand & position management
- **Maintenance Logs** — Labour + parts cost tracking per truck

</td>
<td width="50%" valign="top">

### 💰 Finance & Inventory
- **Invoicing** — Professional PDF invoices with line items, VAT, payment tracking
- **Revenue Tracking** — Multi-source (Trip, Haulage, Invoice-linked, Custom)
- **Expenditure** — Categorised expense logging per truck/branch
- **Purchase Management** — VAT-inclusive purchase orders with stock auto-update
- **Stock Ledger** — Double-entry inventory system (never static fields)
- **Issue Tracking** — Block issues when stock is insufficient

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📊 Reporting & Exports
- **Live Dashboard** — KPIs, expiry alerts, month-at-a-glance
- **10+ Report Types** — Revenue/Expenditure, Fuel, Trips, Stock, VAT, Tyres, Maintenance and more
- **Excel Export** — Branded, styled, auto-sized with frozen headers
- **PDF Export** — Professional layout for invoices and reports
- **Audit Log** — Every create/update/delete tracked with user, IP, timestamp

</td>
<td width="50%" valign="top">

### 🔐 Access & Security
- **Multi-Branch Isolation** — Complete data separation between branches
- **4-Tier RBAC** — Super Admin → Admin → Manager → Employee
- **JWT Authentication** — 8h access token, 7d refresh, blacklist on logout
- **Branch-Scoped APIs** — Backend enforces isolation at queryset level
- **Module Permissions** — Granular per-module access for Managers/Employees
- **Security Logging** — Suspicious 401/403 activity logged automatically

</td>
</tr>
</table>

### 🎯 At a Glance

```text
┌────────────────────┬────────────────────┬────────────────────┬────────────────────┐
│   4  Access Tiers  │  10+ Report Types  │   2  Export Formats│  100% Branch-Scoped│
│  Super→Admin→Mgr→  │  Rev/Exp · Fuel ·  │   PDF  &  Excel    │  Every model has a │
│  Employee          │  Trips · VAT · ... │   (branded)        │  branch ForeignKey │
└────────────────────┴────────────────────┴────────────────────┴────────────────────┘
```

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 📸 Screenshots

> 💡 Add your real screenshots in `docs/screenshots/` and they will render below automatically.

<div align="center">

| Dashboard | Fleet Management |
|:---:|:---:|
| <img src="docs/screenshots/dashboard.png" width="400" alt="Dashboard" /> | <img src="docs/screenshots/trucks.png" width="400" alt="Trucks" /> |
| **Inventory & Stock Ledger** | **Invoicing (PDF)** |
| <img src="docs/screenshots/stock.png" width="400" alt="Stock" /> | <img src="docs/screenshots/invoice.png" width="400" alt="Invoice" /> |
| **Reports & Exports** | **Dark Mode** |
| <img src="docs/screenshots/reports.png" width="400" alt="Reports" /> | <img src="docs/screenshots/dark-mode.png" width="400" alt="Dark mode" /> |

</div>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🏗️ Architecture

### System Overview

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ REACT 18 FRONTEND"]
        direction LR
        UI1[Dashboard]:::ui
        UI2[Fleet]:::ui
        UI3[Inventory]:::ui
        UI4[Finance]:::ui
        UI5[Reports]:::ui
        UI6[Users]:::ui
    end

    subgraph API["⚙️ DJANGO REST FRAMEWORK"]
        direction TB
        MW["AuditLogMiddleware<br/>(all mutations)"]:::mw
        MX["BranchScopedQuerysetMixin<br/>(all ViewSets)"]:::mw
        subgraph APPS["Domain Apps"]
            direction LR
            A1["👤 Users<br/>RBAC + Branch"]:::app
            A2["🚛 Fleet<br/>Trucks · Drivers · Trips<br/>Fuel · Tyres · Maint."]:::app
            A3["📦 Inventory<br/>Purchase · Issue · Stock"]:::app
            A4["💰 Finance<br/>Revenue · Expenditure<br/>Invoicing · Reports"]:::app
        end
        MW --> MX --> APPS
    end

    subgraph DB["🗄️ MYSQL 8.0"]
        D1["FK-enforced · Soft-delete<br/>Indexed · Branch-partitioned"]:::db
    end

    CLIENT -- "HTTPS / REST<br/>JWT Bearer Token" --> API
    API -- "Django ORM<br/>Parameterised SQL" --> DB

    classDef ui fill:#1A56DB,stroke:#fff,color:#fff,stroke-width:1px;
    classDef mw fill:#7C3AED,stroke:#fff,color:#fff,stroke-width:1px;
    classDef app fill:#092E20,stroke:#44B78B,color:#fff,stroke-width:1px;
    classDef db fill:#4479A1,stroke:#fff,color:#fff,stroke-width:1px;
```

### Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant R as React App
    participant A as Axios (api.js)
    participant D as Django API
    participant M as Branch Mixin
    participant DB as MySQL

    U->>R: Open page / switch branch
    R->>A: Request (+ ?branch_id=N)
    A->>D: HTTPS + Bearer JWT
    D->>D: Authenticate + Permission class
    D->>M: get_queryset()
    M->>M: Force branch by role
    M->>DB: Filtered query (branch = X)
    DB-->>D: Rows
    D-->>A: JSON + branch currency
    A-->>R: Data
    R-->>U: Render (currency symbol auto-switches)
    Note over D,DB: Mutations are also written<br/>to AuditLog (user, IP, endpoint)
```

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🧰 Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=python,django,react,mysql,js,html,css,railway,git,github,vscode&perline=11" alt="tech icons" />

</div>

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

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 👥 Role-Based Access Control

```mermaid
flowchart TD
    SA["👑 SUPER ADMIN<br/>All branches · Branch switcher<br/>Creates Admins anywhere"]:::sa
    AD["🛡️ ADMIN (per branch)<br/>Full access in own branch only<br/>Creates Managers & Employees"]:::ad
    MG["📋 MANAGER (per branch)<br/>Module permissions set by Admin<br/>Read + write in permitted modules"]:::mg
    EM["👷 EMPLOYEE (per branch)<br/>Restricted, typically read-only<br/>Edits own profile only"]:::em

    SA ==> AD ==> MG ==> EM

    classDef sa fill:#DC2626,stroke:#fff,color:#fff;
    classDef ad fill:#EA580C,stroke:#fff,color:#fff;
    classDef mg fill:#1A56DB,stroke:#fff,color:#fff;
    classDef em fill:#059669,stroke:#fff,color:#fff;
```

| Capability | 👑 Super Admin | 🛡️ Admin | 📋 Manager | 👷 Employee |
|:--|:---:|:---:|:---:|:---:|
| Access all branches | ✅ | ❌ | ❌ | ❌ |
| Branch switcher in topbar | ✅ | ❌ | ❌ | ❌ |
| Create Admins | ✅ | ❌ | ❌ | ❌ |
| Create Managers / Employees | ✅ | ✅ (own branch) | ❌ | ❌ |
| Promote to Admin / Super Admin | ✅ | ❌ | ❌ | ❌ |
| Users management page | ✅ | ✅ | ❌ | ❌ |
| Full module access in branch | ✅ | ✅ | ⚙️ per-module | ⚙️ per-module |
| Write access | ✅ | ✅ | ✅ (permitted modules) | ⚠️ typically read-only |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🏢 Multi-Branch System

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

```mermaid
flowchart LR
    A["Topbar<br/>BRANCH dropdown"] --> B{"Select"}
    B --> C["Branch 1"]
    B --> D["Branch 2"]
    B --> E["All Branches"]
    C & D & E --> F["All API calls include<br/>?branch_id=N"]
    F --> G["Currency symbol updates"]
    F --> H["Dashboard · Fleet · Inventory<br/>Finance reload"]
```

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 💱 Currency Configuration

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

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 📐 Auto-Calculation Engine

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

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🗄️ Data Model

<details>
<summary><b>📐 Entity-Relationship Diagram (click to expand)</b></summary>
<br/>

```mermaid
erDiagram
    BRANCH ||--o{ USER : "employs"
    BRANCH ||--o{ TRUCK : "owns"
    BRANCH ||--o{ DRIVER : "employs"
    BRANCH ||--o{ ITEM : "stocks"
    BRANCH ||--o{ INVOICE : "issues"
    BRANCH ||--o{ REVENUE : "earns"
    BRANCH ||--o{ EXPENDITURE : "spends"

    TRUCK ||--o{ TRIP : "performs"
    TRUCK ||--o{ FUEL_LOG : "consumes"
    TRUCK ||--o{ TYRE : "fitted with"
    TRUCK ||--o{ MAINTENANCE_LOG : "serviced in"
    TRUCK ||--o{ TRUCK_DOCUMENT : "holds"
    DRIVER ||--o{ TRIP : "drives"

    ITEM ||--o{ STOCK_LEDGER : "tracked by"
    PURCHASE ||--o{ STOCK_LEDGER : "creates inward"
    ISSUE_ITEM ||--o{ STOCK_LEDGER : "creates outward"
    ITEM ||--o{ PURCHASE : "bought as"
    ITEM ||--o{ ISSUE_ITEM : "issued as"

    INVOICE ||--|{ INVOICE_LINE : "contains"
    INVOICE ||--o{ REVENUE : "linked to"
    TRIP ||--o{ REVENUE : "generates"

    USER ||--o{ AUDIT_LOG : "performs"

    BRANCH {
        int id PK
        string name
        string currency
    }
    USER {
        int id PK
        int branch_id FK
        string role
        json module_permissions
    }
    TRUCK {
        int id PK
        int branch_id FK
        string plate_no
    }
    STOCK_LEDGER {
        int id PK
        int item_id FK
        string txn_type
        decimal quantity
        decimal final_amount
    }
    INVOICE {
        int id PK
        int branch_id FK
        decimal total_amount
    }
```

</details>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🗄️ Stock Ledger Rules

> ⚠️ Stock is **never** stored as a static field. It is always computed from ledger entries.

```text
closing_qty   = SUM(quantity)      FROM stock_ledger WHERE item = X
closing_value = SUM(final_amount)  FROM stock_ledger WHERE item = X

Inward  (+): OPENING, PURCHASE, TRANSFER_IN
Outward (−): ISSUE, TRANSFER_OUT

Issue blocked at API level if: available_qty < requested_qty
```

**VAT Calculation:**

```text
base_amount  = quantity × unit_price
vat_amount   = base_amount × (vat_pct / 100)   [if vat_applicable = true]
final_amount = base_amount + vat_amount
```

```mermaid
flowchart LR
    P["🛒 PURCHASE"]:::in --> L[("📒 STOCK LEDGER<br/>+ / − entries")]:::led
    O["📥 OPENING"]:::in --> L
    TI["🔄 TRANSFER IN"]:::in --> L
    L --> C["📊 closing_qty<br/>closing_value<br/>(computed, never stored)"]:::calc
    I["📤 ISSUE"]:::out --> L
    TO["🔄 TRANSFER OUT"]:::out --> L
    I -.->|"blocked if<br/>available < requested"| X["⛔ 400 Error"]:::err

    classDef in fill:#059669,stroke:#fff,color:#fff;
    classDef out fill:#DC2626,stroke:#fff,color:#fff;
    classDef led fill:#1A56DB,stroke:#fff,color:#fff;
    classDef calc fill:#7C3AED,stroke:#fff,color:#fff;
    classDef err fill:#111827,stroke:#DC2626,color:#fff;
```

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🔄 Key Workflows

### 🔐 Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend
    participant B as Backend
    U->>F: Email + Password
    F->>B: POST /api/auth/login/
    B-->>F: access (8h) + refresh (7d) + user
    loop Every request
        F->>B: Authorization: Bearer access
    end
    Note over F,B: Access expired?
    F->>B: POST /api/auth/refresh/
    B-->>F: new access
    U->>F: Logout
    F->>B: POST /api/auth/logout/
    B-->>F: refresh token blacklisted ✔
```

### ⛽ Fuel Log Decision Flow

```mermaid
flowchart TD
    S([Log fuel fill]) --> Q["litres − fuel_limit"]
    Q --> D{"excess > 0 ?"}
    D -- "No" --> OK["Save · compute total_cost"]
    D -- "Yes" --> R{"Remark provided?"}
    R -- "No" --> E["⛔ Remark required"]
    R -- "Yes" --> OK2["Save · flag excess_fuel<br/>compute total_cost"]
    OK --> END([Done])
    OK2 --> END
```

### 📦 Issue Item Flow

```mermaid
flowchart TD
    A([Issue request]) --> B["Fetch available_qty from ledger"]
    B --> C{"available ≥ requested?"}
    C -- "No" --> X["⛔ Blocked: insufficient stock"]
    C -- "Yes" --> D["total_value = qty × last_unit_price"]
    D --> E["Write OUTWARD ledger entry"]
    E --> F["Audit log entry"]
    F --> G([Issued ✔])
```

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 📡 API Reference

> All endpoints are JWT-protected (except login) and **branch-scoped** by the backend.

<details open>
<summary><b>🔑 Authentication</b></summary>

```http
POST   /api/auth/login/          → { access, refresh, user }
POST   /api/auth/logout/         → blacklists refresh token
POST   /api/auth/refresh/        → { access }
GET    /api/auth/me/             → current user profile
```

</details>

<details>
<summary><b>🚛 Fleet</b></summary>

```http
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

</details>

<details>
<summary><b>📦 Inventory</b></summary>

```http
GET/POST   /api/inventory/items/             → stock items
GET/POST   /api/inventory/purchases/         → purchase orders
POST       /api/inventory/purchases/preview/ → preview without saving
GET/POST   /api/inventory/issues/            → issue items
GET        /api/inventory/ledger/            → full stock ledger
GET        /api/inventory/closing-stock/     → current stock levels
GET        /api/inventory/available-stock/   → available qty per item
```

</details>

<details>
<summary><b>💰 Finance</b></summary>

```http
GET/POST   /api/finance/revenue/             → revenue records
GET/POST   /api/finance/expenditure/         → expenditure records
GET/POST   /api/invoicing/invoices/          → invoices
GET        /api/invoicing/invoices/{id}/pdf/ → download PDF
```

</details>

<details>
<summary><b>📊 Reports</b> <i>(all accept <code>?date_from=&date_to=&format=json|pdf|excel&branch_id=</code>)</i></summary>

```http
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

</details>

<details>
<summary><b>🧪 Example: call the API with cURL</b></summary>

```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'

# 2. List trucks for branch 2 (Super Admin)
curl http://localhost:8000/api/trucks/?branch_id=2 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# 3. Download a report as Excel
curl -o fuel.xlsx \
  "http://localhost:8000/api/reports/fuel/?date_from=2026-01-01&date_to=2026-01-31&format=excel" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

</details>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

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

| Level | Trigger |
|:--:|:--|
| 🔴 **Danger** | Already expired (< 0 days) |
| 🟠 **Warning** | Expiring within 30 days |
| 🟡 **Caution** | Expiring within 60 days |

Document types tracked: `VIT` · `Road Worthy` · `Insurance` · `DVLA` · `Fire Extinguisher` · `First Aid Kit`

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🚀 Quick Start

### ✅ Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| MySQL | 8.0 |
| Git | any recent |

### 1️⃣ Clone

```bash
git clone https://github.com/YOUR_GITHUB_USER/Taurus-logistics.git
cd Taurus-logistics
```

### 2️⃣ Backend

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

### 3️⃣ Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
# → App available at http://localhost:3000
```

### 4️⃣ Database (Raw SQL — skip migrations)

```sql
-- Add currency to branches (if running raw SQL)
ALTER TABLE branches ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'GHS';
UPDATE branches SET currency = 'SLL' WHERE id = 2;

-- Register migration
INSERT INTO django_migrations (app, name, applied)
VALUES ('users', '0005_branch_currency', NOW());
```

### ✔️ Verify It Works

| Check | Expected |
|-------|----------|
| `http://localhost:8000/api/` | API responds (JWT required for protected routes) |
| `http://localhost:3000` | Login screen loads |
| Login with superuser | Dashboard opens, branch switcher visible |

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🌐 Environment Variables

```ini
# ── Django ─────────────────────────────────────────────
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.railway.app,localhost

# ── Database ───────────────────────────────────────────
DB_NAME=taurus_erp
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=127.0.0.1
DB_PORT=3306

# ── CORS ───────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app,http://localhost:3000

# ── Frontend ───────────────────────────────────────────
REACT_APP_API_URL=https://your-backend.railway.app/api
```

> 🔒 **Never commit `.env`.** Keep `DEBUG=False` and a strong random `SECRET_KEY` in production.

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## ☁️ Deployment (Railway)

```mermaid
flowchart LR
    GH["GitHub Repo"] -->|push| RW{"Railway"}
    RW --> BE["Backend Service<br/>Django + DRF"]
    RW --> FE["Frontend Service<br/>React build"]
    RW --> SQL[("MySQL Service")]
    FE -->|"REACT_APP_API_URL"| BE
    BE -->|"DB_HOST / DB_*"| SQL
```

1. Create a Railway project with three services: **MySQL**, **Backend**, **Frontend**.
2. Set the backend variables (`SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `DB_*`, `CORS_ALLOWED_ORIGINS`).
3. Set `REACT_APP_API_URL` on the frontend to the backend's public URL + `/api`.
4. Run migrations on the backend service: `python manage.py migrate`.
5. Create the first Super Admin: `python manage.py createsuperuser`.

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 📁 Project Structure

```text
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

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🔐 Security

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

```mermaid
flowchart LR
    REQ["Incoming request"] --> TH{"Throttle OK?"}
    TH -- "No" --> R429["429 Too Many Requests"]
    TH -- "Yes" --> JW{"Valid JWT?"}
    JW -- "No" --> R401["401 + security log"]
    JW -- "Yes" --> RB{"Role / module<br/>permission?"}
    RB -- "No" --> R403["403 + security log"]
    RB -- "Yes" --> BR["Branch scoping<br/>(queryset level)"]
    BR --> OK["✅ Response"]
    BR --> AU["📝 Audit log<br/>(mutations)"]
```

### 🛡️ Reporting a Vulnerability

Please **do not** open a public issue for security problems. Contact the maintainers privately via GitHub and include steps to reproduce.

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🧪 Testing

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

**Suggested manual test matrix**

| Scenario | Expected |
|----------|----------|
| Admin (Branch 1) requests `?branch_id=2` | Still sees Branch 1 data only |
| Issue qty > available stock | Request blocked |
| Fuel litres above limit without remark | Validation error |
| Logout then reuse refresh token | Rejected (blacklisted) |
| Switch branch as Super Admin | Currency symbol and data reload |

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🗺️ Roadmap

```mermaid
gantt
    title Taurus ERP — Roadmap (edit to match your plan)
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y
    section Delivered
    Core Fleet, Fuel, Trips        :done,    d1, 2025-01-01, 60d
    Inventory Ledger + Finance     :done,    d2, after d1, 45d
    Reports + PDF/Excel Export     :done,    d3, after d2, 30d
    Multi-Branch + Currency        :done,    d4, after d3, 20d
    section Planned
    Docker Compose setup           :active,  p1, 2026-12-01, 15d
    CI/CD pipeline                 :         p2, after p1, 15d
    Notifications (email/SMS)      :         p3, after p2, 20d
    Mobile-friendly PWA            :         p4, after p3, 30d
```

- [x] Multi-branch isolation with RBAC
- [x] Double-entry stock ledger
- [x] Branded PDF / Excel exports
- [x] Backend-driven currency per branch
- [ ] Docker Compose for one-command setup
- [ ] GitHub Actions CI (tests + lint)
- [ ] Email / SMS alerts for document expiry
- [ ] Installable PWA

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 🤝 Contributing

Contributions are welcome!

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m "feat: add amazing feature"`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

**Commit convention:** `feat:` · `fix:` · `docs:` · `refactor:` · `test:` · `chore:`

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## ❓ FAQ

<details>
<summary><b>Why is stock not stored as a field on the item?</b></summary>
<br/>
Static quantity fields drift out of sync. Computing closing stock from ledger entries keeps every change traceable and auditable.
</details>

<details>
<summary><b>Is branch isolation only a UI feature?</b></summary>
<br/>
No. <code>BranchScopedQuerysetMixin</code> filters at the queryset level on every ViewSet, so even a hand-crafted API request cannot cross branches (except for Super Admin).
</details>

<details>
<summary><b>How do I add a new branch with its own currency?</b></summary>
<br/>
Insert the branch, then set its <code>currency</code> column (e.g. <code>UPDATE branches SET currency='GHS' WHERE id=N;</code>). The frontend picks it up automatically.
</details>

<details>
<summary><b>Can Managers see the Users page?</b></summary>
<br/>
No. Only Super Admin and Admin can access user management.
</details>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

## 👨‍💻 Built By

<div align="center">

[![Sandilya-17](https://img.shields.io/badge/GitHub-Sandilya--17-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Sandilya-17)
[![gousekareem](https://img.shields.io/badge/GitHub-gousekareem-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/gousekareem)

<br/>

<img src="https://github-readme-stats.vercel.app/api?username=gousekareem&show_icons=true&theme=tokyonight&hide_border=true&count_private=true" height="165" alt="gousekareem stats" />
<img src="https://github-readme-stats.vercel.app/api/top-langs/?username=gousekareem&layout=compact&theme=tokyonight&hide_border=true" height="165" alt="top languages" />

<br/>

<img src="https://github-readme-activity-graph.vercel.app/graph?username=gousekareem&theme=tokyo-night&hide_border=true&area=true" width="100%" alt="activity graph" />

</div>

## 📜 License

Distributed under the **MIT License**. Add a `LICENSE` file to the repo root to make this official.

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="rainbow line" />

<div align="center">

### ⭐ If this project helped you, drop a star! ⭐

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=18&duration=2500&pause=800&color=1A56DB&center=true&vCenter=true&width=700&lines=Built+for+logistics+operations+across+multiple+branches;Fleet+%7C+Fuel+%7C+Inventory+%7C+Finance;Thanks+for+visiting+%F0%9F%9A%9B" alt="footer typing" />

<br/>

![Django](https://img.shields.io/badge/Django-REST_Framework-092E20?style=flat-square&logo=django)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Railway](https://img.shields.io/badge/Hosted_on-Railway-0B0D0E?style=flat-square&logo=railway)

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,18,24&height=140&section=footer" width="100%" alt="footer wave" />

</div>
