-- ============================================================
-- ONLINE EXPENSE MANAGEMENT SYSTEM - RELATIONAL DATABASE SCHEMA
-- File: database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `expense_management` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `expense_management`;

-- 1. USERS / CLIENTS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `contact` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  `salt` VARCHAR(64) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. EXPENSES / TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `payment_mode` ENUM('UPI', 'Card', 'Cash', 'Bank Transfer') NOT NULL DEFAULT 'UPI',
  `description` VARCHAR(255) NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS `budgets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `monthly_limit` DECIMAL(12, 2) NOT NULL,
  `month` TINYINT NOT NULL CHECK (`month` BETWEEN 1 AND 12),
  `year` SMALLINT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_category_period` (`user_id`, `category_id`, `month`, `year`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. REPORTS TABLE
CREATE TABLE IF NOT EXISTS `reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `from_date` DATE NOT NULL,
  `to_date` DATE NOT NULL,
  `total_spent` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `category_breakdown_json` JSON DEFAULT NULL,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INDEXES FOR OPTIMIZED QUERY PERFORMANCE
-- ============================================================
CREATE INDEX `idx_expenses_user_status` ON `expenses` (`user_id`, `status`);
CREATE INDEX `idx_expenses_date` ON `expenses` (`expense_date`);
CREATE INDEX `idx_budgets_lookup` ON `budgets` (`user_id`, `month`, `year`);

-- ============================================================
-- DATABASE VIEWS FOR ANALYTICS
-- ============================================================
CREATE OR REPLACE VIEW `view_approved_category_spending` AS
SELECT 
    e.user_id,
    c.id AS category_id,
    c.name AS category_name,
    SUM(e.amount) AS total_amount,
    COUNT(e.id) AS transaction_count
FROM `expenses` e
JOIN `categories` c ON e.category_id = c.id
WHERE e.status = 'Approved'
GROUP BY e.user_id, c.id, c.name;

-- ============================================================
-- SEED DATA (DEFAULT CATEGORIES & INITIAL ADMIN)
-- Password for admin@oems.com is: admin123
-- ============================================================
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Travel', 'Fuel, flight tickets, cabs, parking'),
(2, 'Food & Refreshments', 'Meals, team outings, client dinners'),
(3, 'Office Supplies', 'Stationery, software, hardware, equipment'),
(4, 'Utilities & Bills', 'Internet, electricity, cloud hosting, phone');

INSERT INTO `users` (`id`, `name`, `email`, `contact`, `role`, `salt`, `password_hash`) VALUES
(1, 'System Administrator', 'admin@oems.com', '+91 9999999999', 'admin', 'seed_salt_123', 'd28362747492020202');