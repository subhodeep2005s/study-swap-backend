-- Up Migration

CREATE TYPE note_type_enum AS ENUM (
    'LECTURE_NOTES',
    'REVISION_NOTES',
    'SHORT_NOTES',
    'FORMULA_SHEET',
    'CHEAT_SHEET',
    'PYQ',
    'QUESTION_PAPER',
    'MOCK_TEST',
    'SOLUTION',
    'STUDY_GUIDE',
    'FLASHCARDS',
    'OTHER'
);

CREATE TYPE note_status_enum AS ENUM (
    'PUBLISHED',
    'HIDDEN'
);

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    title TEXT,
    description TEXT,
    note_type note_type_enum NOT NULL,

    -- Taxonomy References
    country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    education_node_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    category_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    exam_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    board_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    class_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    course_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,

    -- Ownership
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploader_role user_role NOT NULL,

    -- File Details
    file_key TEXT NOT NULL,
    file_url TEXT,
    thumbnail_key TEXT,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    page_count INTEGER,
    file_hash TEXT NOT NULL,

    -- Status & Analytics
    status note_status_enum NOT NULL DEFAULT 'PUBLISHED',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,

    views_count INTEGER NOT NULL DEFAULT 0,
    downloads_count INTEGER NOT NULL DEFAULT 0,
    saves_count INTEGER NOT NULL DEFAULT 0,
    
    average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,

    -- Soft Deletion & Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Unique hash index to quickly find exact duplicates across the whole notes table (unless deleted)
CREATE UNIQUE INDEX idx_notes_file_hash_unique 
ON notes(file_hash) 
WHERE deleted_at IS NULL;

-- Indexes for searching and filtering
CREATE INDEX idx_notes_uploader ON notes(uploader_id);
CREATE INDEX idx_notes_country ON notes(country_id);
CREATE INDEX idx_notes_education_node ON notes(education_node_id);
CREATE INDEX idx_notes_exam ON notes(exam_id);
CREATE INDEX idx_notes_board ON notes(board_id);
CREATE INDEX idx_notes_class ON notes(class_id);
CREATE INDEX idx_notes_course ON notes(course_id);
CREATE INDEX idx_notes_subject ON notes(subject_id);
CREATE INDEX idx_notes_note_type ON notes(note_type);
CREATE INDEX idx_notes_status ON notes(status);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);


CREATE TABLE note_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, note_id)
);

CREATE INDEX idx_note_saves_user ON note_saves(user_id);
CREATE INDEX idx_note_saves_note ON note_saves(note_id);


CREATE TABLE note_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, note_id)
);

CREATE INDEX idx_note_ratings_user ON note_ratings(user_id);
CREATE INDEX idx_note_ratings_note ON note_ratings(note_id);


CREATE TABLE note_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_note_reports_note ON note_reports(note_id);

-- Down Migration

DROP TABLE IF EXISTS note_reports CASCADE;
DROP TABLE IF EXISTS note_ratings CASCADE;
DROP TABLE IF EXISTS note_saves CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TYPE IF EXISTS note_status_enum;
DROP TYPE IF EXISTS note_type_enum;