ALTER TABLE users
MODIFY COLUMN role ENUM('officer', 'recommender', 'Boss', 'delegate') NOT NULL;