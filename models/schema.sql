CREATE TABLE IF NOT EXISTS users (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL,
	password VARCHAR(255) NOT NULL,
	role ENUM('officer', 'recommender', 'Boss', 'delegate') NOT NULL DEFAULT 'officer',
	approval_status VARCHAR(32) NOT NULL DEFAULT 'approved',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	officer_id INT UNSIGNED NOT NULL,
	type ENUM('transport', 'duty travel') NOT NULL,
	form_data JSON NOT NULL,
	status ENUM('draft', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	KEY applications_officer_created (officer_id, created_at),
	CONSTRAINT applications_officer_fk FOREIGN KEY (officer_id)
		REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_attachments (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	request_id INT UNSIGNED NOT NULL,
	file_name VARCHAR(255) NOT NULL,
	file_path VARCHAR(512) NOT NULL,
	file_type VARCHAR(128) NOT NULL,
	uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	KEY request_attachments_request (request_id),
	CONSTRAINT request_attachments_request_fk FOREIGN KEY (request_id)
		REFERENCES applications (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approvals (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	application_id INT UNSIGNED NOT NULL,
	approver_id INT UNSIGNED NOT NULL,
	decision ENUM('approved', 'rejected') NOT NULL,
	comments TEXT NULL,
	approver_signature VARCHAR(512) NOT NULL,
	timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	KEY approvals_application_id (application_id),
	CONSTRAINT approvals_application_fk FOREIGN KEY (application_id)
		REFERENCES applications (id) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT approvals_approver_fk FOREIGN KEY (approver_id)
		REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
