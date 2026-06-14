CREATE TABLE email_login_codes (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_on TIMESTAMP NOT NULL DEFAULT NOW()
);