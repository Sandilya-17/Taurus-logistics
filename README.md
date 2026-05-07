# Taurus Trade & Logistics ERP

Full-stack enterprise ERP system built with Django REST Framework + React.

---

## Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| Backend  | Python 3.11, Django 4.2, Django REST Framework 3.14     |
| Database | MySQL 8.0 (fully normalized, FK-enforced)               |
| Auth     | JWT (access 8h, refresh 7d, blacklist on logout)        |
| Frontend | React 18, React Hook Form, TanStack Query, Recharts     |
| Export   | ReportLab (PDF), OpenPyXL (Excel)                       |
| Currency | Ghana Cedi (GH₵), VAT configurable per transaction      |

---

## Auto-Calculation Logic

Every form field auto-calculates in real time:

| Form          | Input Fields                        | Auto-Calculated Fields                              |
|---------------|-------------------------------------|-----------------------------------------------------|
| Purchase      | qty × unit_price                    | base_amount, vat_amount, final_amount               |
| Issue         | qty × last_unit_price               | total_value, stock validation (block if insufficient)|
| Fuel Log      | litres − fuel_limit                 | excess_fuel (mandatory remark if >0), total_cost    |
| Trip          | loaded_qty − delivered_qty          | qty_difference, trip_revenue, trip_duration         |
| Invoice Line  | qty × unit_price                    | line_total, subtotal, vat_amount, total_amount      |
| Maintenance   | labour_cost + parts_cost            | total_cost                                          |
| VIT           | last_paid_date + 90 days            | next_due_date                                       |
| Tyre Removal  | odometer_remove − odometer_fit      | km_used                                             |

---

## Backend Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

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
python manage.py makemigrations users core inventory trucks drivers trips fuel tyres maintenance finance invoicing reports
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser

# 7. Run dev server
python manage.py runserver
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

---

## Environment Variables (.env)

```ini
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=taurus_erp
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=127.0.0.1
DB_PORT=3306
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## API Endpoints

| Module      | Endpoint                              | Methods            |
|-------------|---------------------------------------|--------------------|
| Auth        | /api/auth/login/                      | POST               |
| Auth        | /api/auth/logout/                     | POST               |
| Auth        | /api/auth/refresh/                    | POST               |
| Users       | /api/users/                           | GET, POST          |
| Inventory   | /api/inventory/items/                 | GET, POST          |
| Inventory   | /api/inventory/purchases/             | GET, POST          |
| Inventory   | /api/inventory/issues/                | GET, POST          |
| Inventory   | /api/inventory/ledger/                | GET                |
| Inventory   | /api/inventory/closing-stock/         | GET                |
| Inventory   | /api/inventory/available-stock/       | GET                |
| **Preview** | /api/inventory/purchases/preview/     | POST (no DB write) |
| Trucks      | /api/trucks/                          | GET, POST          |
| Trucks      | /api/trucks/alerts/                   | GET                |
| Drivers     | /api/drivers/                         | GET, POST          |
| Trips       | /api/trips/                           | GET, POST          |
| **Preview** | /api/trips/preview/                   | POST (no DB write) |
| Fuel        | /api/fuel/logs/                       | GET, POST          |
| **Preview** | /api/fuel/preview/                    | POST (no DB write) |
| Tyres       | /api/tyres/                           | GET, POST          |
| Tyres       | /api/tyres/assign/                    | POST               |
| Tyres       | /api/tyres/swap/                      | POST               |
| Invoicing   | /api/invoicing/                       | GET, POST          |
| Invoicing   | /api/invoicing/{id}/pdf/              | GET → PDF download |
| Finance     | /api/finance/expenditure/             | GET, POST          |
| Finance     | /api/finance/revenue/                 | GET, POST          |
| Maintenance | /api/maintenance/logs/                | GET, POST          |
| Reports     | /api/reports/dashboard/               | GET (KPIs)         |
| Reports     | /api/reports/stock/?format=excel      | GET → .xlsx        |
| Reports     | /api/reports/stock/?format=pdf        | GET → .pdf         |
| Reports     | /api/reports/trips/?format=excel      | GET → .xlsx        |
| Reports     | /api/reports/fuel/?format=pdf         | GET → .pdf         |
| Reports     | /api/reports/vat/?format=excel        | GET → .xlsx        |
| Reports     | /api/reports/revenue-expenditure/     | GET                |

All report endpoints accept: `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&format=json|pdf|excel`

---

## Stock Ledger Rules

- **NEVER** store stock as a static field
- `closing_qty   = SUM(quantity)` from stock_ledger
- `closing_value = SUM(final_amount)` from stock_ledger
- Inward transactions: positive quantity (OPENING, PURCHASE, TRANSFER_IN)
- Outward transactions: negative quantity (ISSUE, TRANSFER_OUT)
- Issue is **blocked at API level** if available qty < requested qty

---

## VAT Calculation

```
base_amount  = quantity × unit_price
vat_amount   = base_amount × (vat_percentage / 100)  [if vat_applicable]
final_amount = base_amount + vat_amount
```

---

## Excel Export — Column Styling

All Excel exports include:
- Row 1: Navy branded company banner
- Row 2: Report title in blue
- Row 3: Generation date
- Row 5: Sky-blue column headers
- Alternating row backgrounds
- Auto-sized columns
- Frozen header row (Row 6)
- Summary totals in navy at bottom

---

## Project Structure

```
taurus_erp/
├── backend/
│   ├── config/             # Django settings, URLs, WSGI
│   ├── apps/
│   │   ├── users/          # Custom user model + RBAC
│   │   ├── core/           # Base models, audit log, middleware
│   │   ├── inventory/      # Items, ledger, purchase, issue
│   │   ├── trucks/         # Fleet management + expiry alerts
│   │   ├── drivers/        # Driver records + licence tracking
│   │   ├── trips/          # Trip management + auto-calc
│   │   ├── fuel/           # Fuel logs + excess detection
│   │   ├── tyres/          # Tyre lifecycle management
│   │   ├── maintenance/    # Service logs
│   │   ├── finance/        # Revenue + expenditure
│   │   ├── invoicing/      # Invoices + PDF export
│   │   └── reports/        # All reports + Excel/PDF export
│   ├── schema.sql          # Complete MySQL schema
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/          # Dashboard, Purchase, Issue, Fuel, Trips, Invoice, Reports
    │   ├── utils/api.js    # Axios + all auto-calc functions
    │   ├── styles/main.css # Complete design system
    │   └── App.jsx         # Routing + Auth + Sidebar
    └── package.json
```
