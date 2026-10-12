CREATE TABLE IF NOT EXISTS npo_positions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  person_name VARCHAR(150),
  photo TEXT,
  parent_position_id INTEGER REFERENCES npo_positions(id) ON DELETE RESTRICT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS npo_board_members (
  id SERIAL PRIMARY KEY,
  board_type VARCHAR(20) NOT NULL CHECK (board_type IN ('executive','advisor')),
  full_name VARCHAR(150) NOT NULL,
  position_title VARCHAR(100) NOT NULL,
  photo TEXT,
  phone VARCHAR(30),
  email VARCHAR(200),
  term_start_date DATE,
  term_end_date DATE,
  bio_notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS npo_members (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  father_name VARCHAR(150),
  mother_name VARCHAR(150),
  national_id VARCHAR(50),
  present_address TEXT,
  permanent_address TEXT,
  phone VARCHAR(30),
  email VARCHAR(200),
  occupation VARCHAR(150),
  date_joined DATE,
  membership_fee_paid NUMERIC(12,2),
  photo TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS npo_meetings (
  id SERIAL PRIMARY KEY,
  meeting_type VARCHAR(20) NOT NULL CHECK (meeting_type IN ('agm','regular')),
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  venue VARCHAR(200),
  agenda TEXT,
  minutes_resolutions TEXT,
  next_meeting_date DATE,
  pdf_data BYTEA,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS npo_meeting_attendees (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL REFERENCES npo_meetings(id) ON DELETE CASCADE,
  attendee_type VARCHAR(20) NOT NULL CHECK (attendee_type IN ('board_member','member')),
  board_member_id INTEGER REFERENCES npo_board_members(id) ON DELETE SET NULL,
  member_id INTEGER REFERENCES npo_members(id) ON DELETE SET NULL,
  attendee_name_snapshot VARCHAR(150) NOT NULL
);

-- Constitution, stored chapter-by-chapter as structured text (not a single
-- opaque PDF) so members can read/search individual articles in the app.
-- `part` groups chapters under the document's two major divisions (e.g.
-- "Memorandum" / "Bylaws"); `chapter_label` holds the source numbering
-- (e.g. "ধারা-৫.১") for display, kept as free text since the source
-- document's numbering isn't strictly sequential.
CREATE TABLE IF NOT EXISTS npo_constitution_chapters (
  id SERIAL PRIMARY KEY,
  part VARCHAR(150),
  chapter_label VARCHAR(50),
  title VARCHAR(300) NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_npo_constitution_chapters_sort ON npo_constitution_chapters(sort_order);

-- NOTE: an earlier revision added `npo_constitution_chapters.status` and an
-- `npo_constitution_chapter_approvals` table for a single-stage, constitution-
-- only approval flow. Both are superseded by the generic `npo_approval_requests`
-- / `npo_approval_votes` engine below and are no longer read or written by any
-- route. Left undropped on already-deployed databases (empty, harmless); not
-- recreated here for fresh installs.

-- Generic, polymorphic approval pipeline. `approvable_type`/`approvable_id`
-- let any NPO record type plug into the same two-stage workflow (Executive
-- Board review, then General Member ratification) without new tables per
-- type — 'constitution_chapter' is the only type wired up today.
CREATE TABLE IF NOT EXISTS npo_approval_requests (
  id SERIAL PRIMARY KEY,
  approvable_type VARCHAR(50) NOT NULL,
  approvable_id INTEGER NOT NULL,
  stage VARCHAR(20) NOT NULL DEFAULT 'board_review'
    CHECK (stage IN ('board_review','member_vote','approved','rejected')),
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_npo_approval_requests_approvable ON npo_approval_requests(approvable_type, approvable_id);

-- One vote per (request, stage, voter). voter_type/voter_id point at
-- npo_board_members or npo_members depending on which stage the vote was
-- cast in; enforced in route code (depends on the request's stage at the
-- time of voting), not a DB constraint.
CREATE TABLE IF NOT EXISTS npo_approval_votes (
  id SERIAL PRIMARY KEY,
  approval_request_id INTEGER NOT NULL REFERENCES npo_approval_requests(id) ON DELETE CASCADE,
  stage VARCHAR(20) NOT NULL CHECK (stage IN ('board_review','member_vote')),
  voter_type VARCHAR(20) NOT NULL CHECK (voter_type IN ('board','member')),
  voter_id INTEGER NOT NULL,
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('approve','reject')),
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(approval_request_id, stage, voter_type, voter_id)
);
CREATE INDEX IF NOT EXISTS idx_npo_approval_votes_request ON npo_approval_votes(approval_request_id);

-- Member self-service portal credentials — staff-issued only (no
-- self-registration), separate from `photo`/`signature`. A row with no
-- password set simply can't log in.
ALTER TABLE npo_members ADD COLUMN IF NOT EXISTS portal_password_hash TEXT;
ALTER TABLE npo_members ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100) UNIQUE;
ALTER TABLE npo_board_members ADD COLUMN IF NOT EXISTS portal_password_hash TEXT;
ALTER TABLE npo_board_members ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100) UNIQUE;

-- Signature images (same base64-data-URL-in-TEXT convention as `photo`), added
-- after the initial release — ALTER so the column lands on already-deployed
-- tables, not just fresh ones.
ALTER TABLE npo_board_members ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE npo_members ADD COLUMN IF NOT EXISTS signature TEXT;
-- Snapshotted alongside attendee_name_snapshot so a signed meeting record
-- doesn't retroactively change if the person's signature is later updated.
ALTER TABLE npo_meeting_attendees ADD COLUMN IF NOT EXISTS signature_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_npo_positions_parent ON npo_positions(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_npo_board_members_type ON npo_board_members(board_type);
CREATE INDEX IF NOT EXISTS idx_npo_meeting_attendees_meeting ON npo_meeting_attendees(meeting_id);
