-- AlterTable: make password nullable and add google_id
ALTER TABLE `users` MODIFY `password` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(255) NULL;
ALTER TABLE `users` ADD UNIQUE INDEX `users_google_id_key`(`google_id`);
