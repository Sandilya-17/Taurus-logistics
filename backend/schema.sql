-- ============================================================
-- TAURUS TRADE & LOGISTICS ERP
-- MySQL Schema — Fully Normalized, Production-Grade
-- ============================================================

CREATE DATABASE IF NOT EXISTS taurus_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE taurus_erp;

SET FOREIGN_KEY_CHECKS = 0;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE users (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email               VARCHAR(254)  NOT NULL UNIQUE,
  first_name          VARCHAR(100)  NOT NULL,
  last_name           VARCHAR(100)  NOT NULL,
  phone               VARCHAR(20)   DEFAULT '',
  password            VARCHAR(128)  NOT NULL,
  role                ENUM('ADMIN','MANAGER','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  module_permissions  JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  is_active           TINYINT(1)    NOT NULL DEFAULT 1,
  is_staff            TINYINT(1)    NOT NULL DEFAULT 0,
  is_superuser        TINYINT(1)    NOT NULL DEFAULT 0,
  last_login          DATETIME      NULL,
  created_at          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_users_email  (email),
  INDEX idx_users_role   (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TOKEN BLACKLIST (JWT) ────────────────────────────────────
CREATE TABLE token_blacklist_outstandingtoken (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  jti         VARCHAR(255)    NOT NULL UNIQUE,
  token       LONGTEXT        NOT NULL,
  created_at  DATETIME(6)     NULL,
  expires_at  DATETIME(6)     NOT NULL,
  INDEX idx_tbo_user   (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE token_blacklist_blacklistedtoken (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_id         BIGINT UNSIGNED NOT NULL UNIQUE,
  blacklisted_at   DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (token_id) REFERENCES token_blacklist_outstandingtoken(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NULL,
  action        ENUM('CREATE','UPDATE','DELETE','VIEW','LOGIN','LOGOUT') NOT NULL,
  model_name    VARCHAR(100) NOT NULL,
  object_id     BIGINT NULL,
  object_repr   VARCHAR(255) DEFAULT '',
  changes       JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  ip_address    VARCHAR(45)  NULL,
  user_agent    VARCHAR(512) DEFAULT '',
  endpoint      VARCHAR(255) DEFAULT '',
  http_method   VARCHAR(10)  DEFAULT '',
  response_code SMALLINT UNSIGNED NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_al_model_obj    (model_name, object_id),
  INDEX idx_al_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SYSTEM ALERTS ────────────────────────────────────────────
CREATE TABLE system_alerts (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  message        TEXT         NOT NULL,
  level          ENUM('INFO','WARNING','DANGER') NOT NULL DEFAULT 'WARNING',
  is_read        TINYINT(1)   NOT NULL DEFAULT 0,
  alert_type     VARCHAR(50)  NOT NULL,
  reference_type VARCHAR(50)  DEFAULT '',
  reference_id   BIGINT NULL,
  created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_sa_type_read (alert_type, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SUPPLIERS ────────────────────────────────────────────────
CREATE TABLE suppliers (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  contact    VARCHAR(100) DEFAULT '',
  phone      VARCHAR(20)  DEFAULT '',
  email      VARCHAR(254) DEFAULT '',
  address    TEXT         DEFAULT '',
  tin        VARCHAR(50)  DEFAULT '',
  deleted_at DATETIME(6)  NULL,
  created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_suppliers_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── VENDORS ──────────────────────────────────────────────────
CREATE TABLE vendors (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  contact    VARCHAR(100) DEFAULT '',
  phone      VARCHAR(20)  DEFAULT '',
  email      VARCHAR(254) DEFAULT '',
  address    TEXT         DEFAULT '',
  deleted_at DATETIME(6)  NULL,
  created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── LOCATIONS ────────────────────────────────────────────────
CREATE TABLE locations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  location_type ENUM('STORE','WORKSHOP','BREAKDOWN') NOT NULL,
  address       TEXT         DEFAULT '',
  deleted_at    DATETIME(6)  NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ITEMS ────────────────────────────────────────────────────
CREATE TABLE items (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(200) NOT NULL UNIQUE,
  item_type      ENUM('SPARE_PART','TYRE','MATERIAL') NOT NULL,
  unit           VARCHAR(30)  NOT NULL DEFAULT 'pcs',
  description    TEXT         DEFAULT '',
  reorder_level  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  deleted_at     DATETIME(6)  NULL,
  created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_items_type (item_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── STOCK LEDGER ─────────────────────────────────────────────
CREATE TABLE stock_ledger (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id          BIGINT UNSIGNED NOT NULL,
  location_id      BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('OPENING','PURCHASE','ISSUE','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT') NOT NULL,
  quantity         DECIMAL(12,3)   NOT NULL,          -- +inward / -outward
  unit_price       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  vat_applicable   TINYINT(1)      NOT NULL DEFAULT 0,
  vat_percentage   DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
  vat_amount       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  base_amount      DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
  final_amount     DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
  reference_type   VARCHAR(50)     DEFAULT '',
  reference_id     BIGINT NULL,
  remark           TEXT            DEFAULT '',
  created_by_id    BIGINT UNSIGNED NULL,
  created_at       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_sl_item_loc_date    (item_id, location_id, created_at),
  INDEX idx_sl_tx_type_date     (transaction_type, created_at),
  FOREIGN KEY (item_id)       REFERENCES items(id)     ON DELETE RESTRICT,
  FOREIGN KEY (location_id)   REFERENCES locations(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_id) REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── PURCHASES ────────────────────────────────────────────────
CREATE TABLE purchases (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  item_id         BIGINT UNSIGNED NOT NULL,
  location_id     BIGINT UNSIGNED NOT NULL,
  quantity        DECIMAL(12,3)   NOT NULL,
  unit_price      DECIMAL(12,2)   NOT NULL,
  vat_applicable  TINYINT(1)      NOT NULL DEFAULT 0,
  vat_percentage  DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
  vat_amount      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  base_amount     DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
  final_amount    DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
  invoice_number  VARCHAR(100)    DEFAULT '',
  purchase_date   DATE            NOT NULL,
  remark          TEXT            DEFAULT '',
  ledger_entry_id BIGINT UNSIGNED NULL UNIQUE,
  created_by_id   BIGINT UNSIGNED NULL,
  created_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_pur_date       (purchase_date),
  INDEX idx_pur_supplier   (supplier_id),
  FOREIGN KEY (supplier_id)     REFERENCES suppliers(id)    ON DELETE RESTRICT,
  FOREIGN KEY (item_id)         REFERENCES items(id)        ON DELETE RESTRICT,
  FOREIGN KEY (location_id)     REFERENCES locations(id)    ON DELETE RESTRICT,
  FOREIGN KEY (ledger_entry_id) REFERENCES stock_ledger(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id)   REFERENCES users(id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ISSUE ITEMS ──────────────────────────────────────────────
CREATE TABLE issue_items (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id         BIGINT UNSIGNED NOT NULL,
  location_id     BIGINT UNSIGNED NOT NULL,
  truck_id        BIGINT UNSIGNED NULL,
  issue_type      ENUM('TRUCK','WORKSHOP','BREAKDOWN') NOT NULL,
  quantity        DECIMAL(12,3)   NOT NULL,
  unit_price      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  final_amount    DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
  issue_date      DATE            NOT NULL,
  remark          TEXT            DEFAULT '',
  ledger_entry_id BIGINT UNSIGNED NULL UNIQUE,
  created_by_id   BIGINT UNSIGNED NULL,
  created_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_issue_date (issue_date),
  FOREIGN KEY (item_id)         REFERENCES items(id)        ON DELETE RESTRICT,
  FOREIGN KEY (location_id)     REFERENCES locations(id)    ON DELETE RESTRICT,
  FOREIGN KEY (ledger_entry_id) REFERENCES stock_ledger(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id)   REFERENCES users(id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TRUCKS ───────────────────────────────────────────────────
CREATE TABLE trucks (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  truck_number         VARCHAR(20)  NOT NULL UNIQUE,
  model                VARCHAR(100) NOT NULL,
  make                 VARCHAR(100) DEFAULT '',
  year                 SMALLINT UNSIGNED NULL,
  chassis_number       VARCHAR(50)  DEFAULT '',
  status               ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  inactive_reason      TEXT         DEFAULT '',
  insurance_expiry     DATE NULL,
  dvla_expiry          DATE NULL,
  fitness_expiry       DATE NULL,
  permit_expiry        DATE NULL,
  vit_last_paid_date   DATE NULL,
  vit_next_due_date    DATE NULL,
  current_odometer     DECIMAL(10,1) NOT NULL DEFAULT 0.0,
  deleted_at           DATETIME(6)  NULL,
  created_at           DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at           DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_truck_status  (status),
  INDEX idx_truck_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TRUCK DOCUMENTS ──────────────────────────────────────────
CREATE TABLE truck_documents (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  truck_id      BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(50)  NOT NULL,
  file          VARCHAR(500) NOT NULL,
  uploaded_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  uploaded_by_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (truck_id)       REFERENCES trucks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── DRIVERS ──────────────────────────────────────────────────
CREATE TABLE drivers (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(150) NOT NULL,
  phone               VARCHAR(20)  NOT NULL,
  ghana_card_no       VARCHAR(20)  NOT NULL UNIQUE,
  date_of_birth       DATE NULL,
  address             TEXT DEFAULT '',
  licence_number      VARCHAR(50)  NOT NULL UNIQUE,
  licence_class       VARCHAR(10)  NOT NULL DEFAULT 'C',
  licence_issue_date  DATE NULL,
  licence_expiry_date DATE NOT NULL,
  status              ENUM('ACTIVE','SUSPENDED','RESIGNED') NOT NULL DEFAULT 'ACTIVE',
  assigned_truck_id   BIGINT UNSIGNED NULL,
  deleted_at          DATETIME(6)  NULL,
  created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_driver_status  (status),
  INDEX idx_driver_licence (licence_expiry_date),
  FOREIGN KEY (assigned_truck_id) REFERENCES trucks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── DRIVER DOCUMENTS ─────────────────────────────────────────
CREATE TABLE driver_documents (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id      BIGINT UNSIGNED NOT NULL,
  document_type  VARCHAR(50)  NOT NULL,
  file           VARCHAR(500) NOT NULL,
  uploaded_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  uploaded_by_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (driver_id)      REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TRIPS ────────────────────────────────────────────────────
CREATE TABLE trips (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  truck_id              BIGINT UNSIGNED NOT NULL,
  driver_id             BIGINT UNSIGNED NOT NULL,
  waybill_no            VARCHAR(50)     NOT NULL UNIQUE,
  origin                VARCHAR(150)    NOT NULL,
  destination           VARCHAR(150)    NOT NULL,
  material_type         VARCHAR(100)    NOT NULL,
  loaded_qty            DECIMAL(10,3)   NOT NULL,
  delivered_qty         DECIMAL(10,3)   NULL,
  qty_difference        DECIMAL(10,3)   NULL,         -- AUTO: loaded - delivered
  loading_time          DATETIME        NOT NULL,
  unloading_time        DATETIME        NULL,
  trip_duration_minutes INT             NULL,         -- AUTO: (unloading - loading) in minutes
  status                ENUM('PLANNED','EN_ROUTE','DELAYED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  rate_per_ton          DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  trip_revenue          DECIMAL(14,2)   NOT NULL DEFAULT 0.00,  -- AUTO: delivered_qty × rate
  remark                TEXT            DEFAULT '',
  created_by_id         BIGINT UNSIGNED NULL,
  created_at            DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at            DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_trip_status     (status),
  INDEX idx_trip_truck      (truck_id),
  INDEX idx_trip_driver     (driver_id),
  INDEX idx_trip_load_time  (loading_time),
  FOREIGN KEY (truck_id)    REFERENCES trucks(id)  ON DELETE RESTRICT,
  FOREIGN KEY (driver_id)   REFERENCES drivers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── FUEL LIMITS ──────────────────────────────────────────────
CREATE TABLE fuel_limits (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  truck_id    BIGINT UNSIGNED NOT NULL UNIQUE,
  fuel_limit  DECIMAL(8,2)   NOT NULL,
  created_at  DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at  DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── FUEL LOGS ────────────────────────────────────────────────
CREATE TABLE fuel_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  truck_id        BIGINT UNSIGNED NOT NULL,
  trip_id         BIGINT UNSIGNED NULL,
  date            DATE           NOT NULL,
  litres          DECIMAL(8,2)   NOT NULL,
  fuel_limit      DECIMAL(8,2)   NOT NULL,
  excess_fuel     DECIMAL(8,2)   NOT NULL DEFAULT 0.00,  -- AUTO: MAX(0, litres - limit)
  price_per_litre DECIMAL(8,2)   NOT NULL DEFAULT 0.00,
  total_cost      DECIMAL(12,2)  NOT NULL DEFAULT 0.00,  -- AUTO: litres × price
  odometer        DECIMAL(10,1)  NULL,
  remark          TEXT           DEFAULT '',
  created_by_id   BIGINT UNSIGNED NULL,
  created_at      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_fuel_truck_date (truck_id, date),
  INDEX idx_fuel_excess     (excess_fuel),
  FOREIGN KEY (truck_id)      REFERENCES trucks(id) ON DELETE RESTRICT,
  FOREIGN KEY (trip_id)       REFERENCES trips(id)  ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TYRES ────────────────────────────────────────────────────
CREATE TABLE tyres (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  serial_number   VARCHAR(50)  NOT NULL UNIQUE,
  brand           VARCHAR(100) NOT NULL,
  model           VARCHAR(100) NOT NULL,
  size            VARCHAR(30)  NOT NULL,
  unit_cost       DECIMAL(12,2) NOT NULL,
  status          ENUM('STORE','FITTED','WORKSHOP','CONDEMNED') NOT NULL DEFAULT 'STORE',
  inventory_item_id BIGINT UNSIGNED NULL,
  deleted_at      DATETIME(6)  NULL,
  created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_tyre_status (status),
  FOREIGN KEY (inventory_item_id) REFERENCES items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TYRE ASSIGNMENTS ─────────────────────────────────────────
CREATE TABLE tyre_assignments (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tyre_id          BIGINT UNSIGNED NOT NULL,
  truck_id         BIGINT UNSIGNED NOT NULL,
  position         VARCHAR(10)     NOT NULL,
  fitted_at        DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  odometer_fit     DECIMAL(10,1)   NOT NULL DEFAULT 0.0,
  removed_at       DATETIME(6)     NULL,
  odometer_remove  DECIMAL(10,1)   NULL,
  km_used          DECIMAL(10,1)   NULL,            -- AUTO: odometer_remove - odometer_fit
  removal_reason   TEXT            DEFAULT '',
  created_at       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_ta_tyre_active  (tyre_id, removed_at),
  INDEX idx_ta_truck_active (truck_id, removed_at),
  FOREIGN KEY (tyre_id)  REFERENCES tyres(id)  ON DELETE RESTRICT,
  FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TYRE SWAPS ───────────────────────────────────────────────
CREATE TABLE tyre_swaps (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tyre_id        BIGINT UNSIGNED NOT NULL,
  from_truck_id  BIGINT UNSIGNED NOT NULL,
  to_truck_id    BIGINT UNSIGNED NULL,
  from_position  VARCHAR(10)     NOT NULL,
  to_position    VARCHAR(10)     DEFAULT '',
  swap_date      DATE            NOT NULL,
  odometer       DECIMAL(10,1)   NOT NULL,
  remarks        TEXT            DEFAULT '',
  performed_by_id BIGINT UNSIGNED NULL,
  created_at     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_swap_tyre (tyre_id),
  FOREIGN KEY (tyre_id)         REFERENCES tyres(id)  ON DELETE RESTRICT,
  FOREIGN KEY (from_truck_id)   REFERENCES trucks(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_truck_id)     REFERENCES trucks(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by_id) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── MECHANICS ────────────────────────────────────────────────
CREATE TABLE mechanics (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(20)  DEFAULT '',
  specialty  VARCHAR(100) DEFAULT '',
  created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── MAINTENANCE LOGS ─────────────────────────────────────────
CREATE TABLE maintenance_logs (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  truck_id                BIGINT UNSIGNED NOT NULL,
  mechanic_id             BIGINT UNSIGNED NULL,
  maintenance_type        ENUM('PREVENTIVE','CORRECTIVE','BREAKDOWN') NOT NULL,
  description             TEXT            NOT NULL,
  odometer_at_service     DECIMAL(10,1)   NULL,
  service_date            DATE            NOT NULL,
  next_service_date       DATE            NULL,
  next_service_odometer   DECIMAL(10,1)   NULL,
  labour_cost             DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  parts_cost              DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  total_cost              DECIMAL(12,2)   NOT NULL DEFAULT 0.00,  -- AUTO: labour + parts
  status                  ENUM('PENDING','IN_PROGRESS','DONE') NOT NULL DEFAULT 'PENDING',
  remark                  TEXT            DEFAULT '',
  created_by_id           BIGINT UNSIGNED NULL,
  created_at              DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at              DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_maint_truck_date (truck_id, service_date),
  INDEX idx_maint_status     (status),
  FOREIGN KEY (truck_id)      REFERENCES trucks(id)    ON DELETE RESTRICT,
  FOREIGN KEY (mechanic_id)   REFERENCES mechanics(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── MAINTENANCE PARTS ────────────────────────────────────────
CREATE TABLE maintenance_parts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  maintenance_id  BIGINT UNSIGNED NOT NULL,
  item_id         BIGINT UNSIGNED NOT NULL,
  quantity        DECIMAL(10,3)   NOT NULL,
  unit_price      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  total_price     DECIMAL(14,2)   NOT NULL DEFAULT 0.00,  -- AUTO: qty × unit_price
  created_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (maintenance_id) REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)        REFERENCES items(id)            ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── INVOICES ─────────────────────────────────────────────────
CREATE TABLE invoices (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(30)  NOT NULL UNIQUE,
  client_name    VARCHAR(200) NOT NULL,
  client_address TEXT         DEFAULT '',
  client_phone   VARCHAR(20)  DEFAULT '',
  invoice_date   DATE         NOT NULL,
  due_date       DATE         NULL,
  trip_id        BIGINT UNSIGNED NULL,
  status         ENUM('DRAFT','SENT','PAID','OVERDUE') NOT NULL DEFAULT 'DRAFT',
  vat_applicable TINYINT(1)   NOT NULL DEFAULT 0,
  vat_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  subtotal       DECIMAL(14,2) NOT NULL DEFAULT 0.00,   -- AUTO: SUM of line totals
  vat_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,   -- AUTO: subtotal × vat%
  total_amount   DECIMAL(14,2) NOT NULL DEFAULT 0.00,   -- AUTO: subtotal + vat_amount
  paid_amount    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  balance_due    DECIMAL(14,2) NOT NULL DEFAULT 0.00,   -- AUTO: total - paid
  notes          TEXT          DEFAULT '',
  created_by_id  BIGINT UNSIGNED NULL,
  created_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_inv_date   (invoice_date),
  INDEX idx_inv_status (status),
  FOREIGN KEY (trip_id)       REFERENCES trips(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── INVOICE LINES ────────────────────────────────────────────
CREATE TABLE invoice_lines (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id  BIGINT UNSIGNED NOT NULL,
  description VARCHAR(300)    NOT NULL,
  quantity    DECIMAL(10,3)   NOT NULL,
  unit_price  DECIMAL(12,2)   NOT NULL,
  line_total  DECIMAL(14,2)   NOT NULL DEFAULT 0.00,  -- AUTO: qty × unit_price
  created_at  DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at  DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── EXPENDITURES ─────────────────────────────────────────────
CREATE TABLE expenditures (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  truck_id     BIGINT UNSIGNED NULL,
  vendor_id    BIGINT UNSIGNED NULL,
  category     ENUM('FUEL','MAINTENANCE','TYRE','SPARE_PART','DRIVER_WAGE','TOLL','ADMIN','OTHER') NOT NULL,
  description  TEXT         DEFAULT '',
  amount       DECIMAL(14,2) NOT NULL,
  date         DATE          NOT NULL,
  reference    VARCHAR(100)  DEFAULT '',
  receipt      VARCHAR(500)  NULL,
  created_by_id BIGINT UNSIGNED NULL,
  created_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_exp_date     (date),
  INDEX idx_exp_category (category),
  INDEX idx_exp_truck    (truck_id),
  FOREIGN KEY (truck_id)      REFERENCES trucks(id)  ON DELETE SET NULL,
  FOREIGN KEY (vendor_id)     REFERENCES vendors(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── REVENUES ─────────────────────────────────────────────────
CREATE TABLE revenues (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id   BIGINT UNSIGNED NULL,
  trip_id      BIGINT UNSIGNED NULL,
  source       ENUM('HAULAGE','OTHER') NOT NULL DEFAULT 'HAULAGE',
  description  TEXT          DEFAULT '',
  amount       DECIMAL(14,2) NOT NULL,
  date         DATE          NOT NULL,
  reference    VARCHAR(100)  DEFAULT '',
  created_by_id BIGINT UNSIGNED NULL,
  created_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_rev_date   (date),
  INDEX idx_rev_source (source),
  FOREIGN KEY (invoice_id)    REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (trip_id)       REFERENCES trips(id)    ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- USEFUL REPORTING VIEWS
-- ============================================================

-- Current stock positions
CREATE OR REPLACE VIEW v_stock_positions AS
SELECT
    i.id           AS item_id,
    i.name         AS item_name,
    i.item_type,
    i.unit,
    l.id           AS location_id,
    l.name         AS location_name,
    SUM(sl.quantity)     AS closing_qty,
    SUM(sl.final_amount) AS closing_value
FROM stock_ledger sl
JOIN items     i ON sl.item_id     = i.id
JOIN locations l ON sl.location_id = l.id
GROUP BY i.id, i.name, i.item_type, i.unit, l.id, l.name;

-- Monthly revenue vs expenditure
CREATE OR REPLACE VIEW v_monthly_pnl AS
SELECT
    DATE_FORMAT(r.date, '%Y-%m') AS month,
    COALESCE(SUM(r.amount), 0)   AS total_revenue,
    COALESCE(e.total_exp, 0)     AS total_expenditure,
    COALESCE(SUM(r.amount), 0) - COALESCE(e.total_exp, 0) AS net_profit
FROM revenues r
LEFT JOIN (
    SELECT DATE_FORMAT(date,'%Y-%m') AS m, SUM(amount) AS total_exp
    FROM expenditures GROUP BY m
) e ON DATE_FORMAT(r.date, '%Y-%m') = e.m
GROUP BY month, e.total_exp
ORDER BY month DESC;

-- Fuel excess summary per truck
CREATE OR REPLACE VIEW v_fuel_excess_summary AS
SELECT
    t.truck_number,
    COUNT(fl.id)        AS total_fills,
    SUM(fl.litres)      AS total_litres,
    SUM(fl.fuel_limit)  AS total_limit,
    SUM(fl.excess_fuel) AS total_excess,
    SUM(fl.total_cost)  AS total_cost,
    ROUND(SUM(fl.fuel_limit) / NULLIF(SUM(fl.litres),0) * 100, 1) AS efficiency_pct
FROM fuel_logs fl
JOIN trucks t ON fl.truck_id = t.id
GROUP BY t.id, t.truck_number
ORDER BY total_excess DESC;

-- Active tyre assignments
CREATE OR REPLACE VIEW v_active_tyres AS
SELECT
    ty.serial_number,
    ty.brand,
    ty.size,
    tr.truck_number,
    ta.position,
    ta.odometer_fit,
    ta.fitted_at,
    ty.unit_cost
FROM tyre_assignments ta
JOIN tyres  ty ON ta.tyre_id  = ty.id
JOIN trucks tr ON ta.truck_id = tr.id
WHERE ta.removed_at IS NULL;
