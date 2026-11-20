-- ============================================================================
-- QUANTUM EXPENSE & PERSONAL FINANCE MANAGEMENT SYSTEM - DATABASE SCHEMA
-- File: database.sql
-- Engine: MySQL 8.0+ / MariaDB 10.5+ / PostgreSQL Compatible
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `quantum_finance`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `quantum_finance`;

-- 1. USERS & PROFILES
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  `salt` VARCHAR(64) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `preferred_currency` VARCHAR(5) DEFAULT 'USD',
  `preferred_language` VARCHAR(5) DEFAULT 'en',
  `theme_mode` ENUM('cyberpunk', 'dark', 'light') DEFAULT 'cyberpunk',
  `two_factor_enabled` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. ACCOUNTS (Bank, Wallet, Cash, Credit Card)
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `account_type` ENUM('Bank', 'Wallet', 'Cash', 'Credit Card', 'Savings') NOT NULL,
  `account_number` VARCHAR(50) DEFAULT NULL,
  `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(5) DEFAULT 'USD',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. EXPENSE & INCOME CATEGORIES
CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT DEFAULT NULL, -- NULL indicates system-wide global category
  `name` VARCHAR(60) NOT NULL,
  `type` ENUM('expense', 'income') NOT NULL DEFAULT 'expense',
  `color_code` VARCHAR(10) DEFAULT '#00ffcc',
  `icon` VARCHAR(30) DEFAULT 'shield',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TRANSACTIONS
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `account_id` BIGINT NOT NULL,
  `to_account_id` BIGINT DEFAULT NULL, -- For Account-to-Account Transfers
  `category_id` BIGINT NOT NULL,
  `type` ENUM('income', 'expense', 'transfer') NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `tax_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `transaction_date` DATE NOT NULL,
  `payment_method` ENUM('UPI', 'Card', 'Cash', 'Bank Transfer', 'Crypto') NOT NULL,
  `payee_or_payer` VARCHAR(100) DEFAULT NULL,
  `description` VARCHAR(255) NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Approved',
  `is_recurring` TINYINT(1) DEFAULT 0,
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. BUDGET MANAGEMENT (Monthly & Weekly)
CREATE TABLE IF NOT EXISTS `budgets` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `category_id` BIGINT NOT NULL,
  `period_type` ENUM('weekly', 'monthly') NOT NULL DEFAULT 'monthly',
  `limit_amount` DECIMAL(15, 2) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `alert_threshold_pct` INT DEFAULT 80,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. SAVINGS GOALS & EMERGENCY FUNDS
CREATE TABLE IF NOT EXISTS `savings_goals` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `goal_name` VARCHAR(100) NOT NULL,
  `target_amount` DECIMAL(15, 2) NOT NULL,
  `current_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `target_date` DATE NOT NULL,
  `is_emergency_fund` TINYINT(1) DEFAULT 0,
  `status` ENUM('active', 'achieved', 'abandoned') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. RECURRING SUBSCRIPTIONS & BILLS
CREATE TABLE IF NOT EXISTS `recurring_schedules` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `account_id` BIGINT NOT NULL,
  `category_id` BIGINT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL DEFAULT 'expense',
  `frequency` ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
  `next_due_date` DATE NOT NULL,
  `is_auto_pay` TINYINT(1) DEFAULT 0,
  `status` ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. LOANS & CREDIT CARDS (EMI Tracker)
CREATE TABLE IF NOT EXISTS `loans_and_credit` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `type` ENUM('loan', 'credit_card') NOT NULL,
  `total_principal` DECIMAL(15, 2) NOT NULL,
  `remaining_balance` DECIMAL(15, 2) NOT NULL,
  `interest_rate_annual` DECIMAL(5, 2) NOT NULL,
  `emi_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `due_day_of_month` INT DEFAULT 1,
  `start_date` DATE NOT NULL,
  `end_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. AI LOGS & FINANCIAL INSIGHTS
CREATE TABLE IF NOT EXISTS `ai_insights_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `insight_type` ENUM('anomaly', 'prediction', 'recommendation', 'health_score') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `analysis_body` TEXT NOT NULL,
  `score_impact` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. SYSTEM AUDIT LOGS
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SEED DATA SETUP
-- ============================================================================
INSERT INTO `categories` (`id`, `name`, `type`, `color_code`) VALUES
(1, 'Cybertech & Software', 'expense', '#00f3ff'),
(2, 'Energy & Utilities', 'expense', '#ff0055'),
(3, 'Nutritional Supplies', 'expense', '#ffb700'),
(4, 'Housing & Base Operations', 'expense', '#00ff66'),
(5, 'Neural Payroll (Salary)', 'income', '#00ffcc'),
(6, 'Quantum Investments', 'income', '#9d00ff');

INSERT INTO `users` (`id`, `uuid`, `full_name`, `email`, `role`, `salt`, `password_hash`) VALUES
(1, 'usr-admin-01', 'Commander Admin', 'admin@quantum.io', 'admin', 'salt_hud_1', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
(2, 'usr-client-01', 'Netrunner Client', 'client@quantum.io', 'user', 'salt_hud_2', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

INSERT INTO `accounts` (`id`, `user_id`, `account_name`, `account_type`, `balance`, `currency`) VALUES
(1, 2, 'Main Cyber Vault', 'Bank', 48500.00, 'USD'),
(2, 2, 'Crypto Quantum Wallet', 'Wallet', 12400.50, 'USD'),
(3, 2, 'Matrix Credit Card', 'Credit Card', -1250.00, 'USD');

INSERT INTO `transactions` (`id`, `user_id`, `account_id`, `category_id`, `type`, `amount`, `transaction_date`, `payment_method`, `description`, `status`) VALUES
(101, 2, 1, 5, 'income', 8500.00, '2025-03-01', 'Bank Transfer', 'Neural Net Monthly Salary', 'Approved'),
(102, 2, 1, 1, 'expense', 299.00, '2025-03-02', 'Card', 'Cloud Server Hosting Unit', 'Approved'),
(103, 2, 2, 3, 'expense', 145.50, '2025-03-03', 'Crypto', 'Hydroponic Provisions', 'Approved');
