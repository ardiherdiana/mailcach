-- CreateTable
CREATE TABLE `inbox_emails` (
    `id` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(500) NULL,
    `sender` VARCHAR(500) NULL,
    `recipient` VARCHAR(255) NOT NULL,
    `body` TEXT NULL,
    `body_html` LONGTEXT NULL,
    `timestamp` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inbox_emails_recipient_idx`(`recipient`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
