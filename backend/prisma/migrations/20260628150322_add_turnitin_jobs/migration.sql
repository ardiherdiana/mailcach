-- CreateTable
CREATE TABLE `turnitin_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `file_size_bytes` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `upload_path` VARCHAR(500) NOT NULL,
    `result_path` VARCHAR(500) NULL,
    `similarity_score` INTEGER NULL,
    `admin_note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `turnitin_jobs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `turnitin_jobs` ADD CONSTRAINT `turnitin_jobs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
