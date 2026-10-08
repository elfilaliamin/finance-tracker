-- =====================================================================
-- Personal Income & Net Worth Tracker — Database Schema
-- Target: PostgreSQL (Docker)
-- =====================================================================

-- ---------------------------------------------------------------------
-- users  (single admin account)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the single admin user.
-- Password: Mangapro2022
INSERT INTO users (username, password_hash, display_name)
VALUES ('admin', '$2b$12$Ywc.6d5L/e4y3xC0EOX1WuiPHjoQg.ptDSwivKqeTrdc30TAQBaGi', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------
-- income_sources
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS income_sources (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20)  DEFAULT '#4F46E5',
  icon        VARCHAR(50)  DEFAULT 'FaMoneyBillWave',
  description TEXT,
  status      VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_income_sources_status ON income_sources (status);
CREATE INDEX IF NOT EXISTS idx_income_sources_name ON income_sources (name);
CREATE INDEX IF NOT EXISTS idx_income_sources_sort_order ON income_sources (sort_order);

-- ---------------------------------------------------------------------
-- exchange_rates  (cached daily rates, base currency = MAD)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exchange_rates (
  id            SERIAL PRIMARY KEY,
  base_currency VARCHAR(3)  NOT NULL DEFAULT 'MAD',
  currency      VARCHAR(3)  NOT NULL,
  rate_to_base  DECIMAL(18,6) NOT NULL,
  source_api    VARCHAR(50) DEFAULT NULL,
  fetched_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_currency_fetched ON exchange_rates (currency, fetched_at);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates (currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at ON exchange_rates (fetched_at);

-- ---------------------------------------------------------------------
-- income
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS income (
  id                  SERIAL PRIMARY KEY,
  income_source_id    INT NOT NULL REFERENCES income_sources(id) ON DELETE RESTRICT,
  entry_date          DATE NOT NULL,
  month               SMALLINT NOT NULL,
  year                SMALLINT NOT NULL,
  category            VARCHAR(100) DEFAULT NULL,
  description         VARCHAR(255) DEFAULT NULL,
  original_currency   VARCHAR(3) NOT NULL,
  original_amount     DECIMAL(18,2) NOT NULL,
  exchange_rate_used  DECIMAL(18,6) NOT NULL DEFAULT 1.000000,
  base_amount         DECIMAL(18,2) NOT NULL,
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_income_amount_nonneg CHECK (original_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_income_entry_date ON income (entry_date);
CREATE INDEX IF NOT EXISTS idx_income_month_year ON income (year, month);
CREATE INDEX IF NOT EXISTS idx_income_currency ON income (original_currency);
CREATE INDEX IF NOT EXISTS idx_income_source ON income (income_source_id);

-- ---------------------------------------------------------------------
-- networth  (can be negative — no non-negative constraint)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS networth (
  id                  SERIAL PRIMARY KEY,
  entry_date          DATE NOT NULL UNIQUE,
  original_currency   VARCHAR(3) NOT NULL,
  original_amount     DECIMAL(18,2) NOT NULL,
  exchange_rate_used  DECIMAL(18,6) NOT NULL DEFAULT 1.000000,
  base_amount         DECIMAL(18,2) NOT NULL,
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_networth_entry_date ON networth (entry_date);

-- ---------------------------------------------------------------------
-- settings  (single-row key/value store)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                    SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  theme                 VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  display_currency      VARCHAR(3) DEFAULT 'MAD',
  conversion_mode       VARCHAR(20) DEFAULT 'historical' CHECK (conversion_mode IN ('historical', 'live')),
  exchange_api          VARCHAR(50) DEFAULT 'frankfurter',
  auto_update_rates     VARCHAR(20) DEFAULT 'daily' CHECK (auto_update_rates IN ('startup', 'hourly', 'daily', 'manual')),
  last_rate_update      TIMESTAMP DEFAULT NULL,
  next_scheduled_update TIMESTAMP DEFAULT NULL,
  language              VARCHAR(5) DEFAULT 'en' CHECK (language IN ('en', 'ar', 'fr')),
  dashboard_config      JSONB DEFAULT NULL,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50)  DEFAULT NULL,
  entity_id   INT DEFAULT NULL,
  details     JSONB DEFAULT NULL,
  ip_address  VARCHAR(45) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at);

-- ---------------------------------------------------------------------
-- login_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  username    VARCHAR(50) NOT NULL,
  success     SMALLINT NOT NULL,
  ip_address  VARCHAR(45) DEFAULT NULL,
  user_agent  VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_logs_username ON login_logs (username);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs (created_at);

-- ---------------------------------------------------------------------
-- Sample seed data (income sources + exchange rates) — optional
-- ---------------------------------------------------------------------
INSERT INTO income_sources (name, color, icon, description, status, sort_order) VALUES
  ('Salary', '#4F46E5', 'FaBriefcase', 'Primary employment income', 'active', 1),
  ('Freelance', '#059669', 'FaLaptopCode', 'Freelance / contract work', 'active', 2),
  ('Investments', '#D97706', 'FaChartLine', 'Dividends and capital gains', 'active', 3)
ON CONFLICT DO NOTHING;

INSERT INTO exchange_rates (base_currency, currency, rate_to_base, source_api) VALUES
  ('MAD', 'USD', 9.78, 'cached'),
  ('MAD', 'EUR', 10.63, 'cached'),
  ('MAD', 'MAD', 1.00, 'cached')
ON CONFLICT DO NOTHING;
