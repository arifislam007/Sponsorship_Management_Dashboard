CREATE TABLE IF NOT EXISTS notification_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_secure BOOLEAN DEFAULT false,
  smtp_user VARCHAR(255),
  smtp_pass VARCHAR(255),
  smtp_from VARCHAR(255),
  telegram_bot_token VARCHAR(500),
  vapid_public_key TEXT,
  vapid_private_key TEXT,
  vapid_subject VARCHAR(255) DEFAULT 'mailto:admin@sombhabona.org',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notification_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT false,
  email_address VARCHAR(255),
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_chat_id VARCHAR(100),
  web_push_enabled BOOLEAN DEFAULT true,
  notify_task_assigned BOOLEAN DEFAULT true,
  notify_leave_update BOOLEAN DEFAULT true,
  notify_system BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  event_type VARCHAR(50),
  title VARCHAR(255),
  body TEXT,
  status VARCHAR(20) DEFAULT 'sent',
  error TEXT,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_log_user ON notification_log(user_id, sent_at DESC);
