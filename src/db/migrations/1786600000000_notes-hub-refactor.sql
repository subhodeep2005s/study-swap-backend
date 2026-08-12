-- Up Migration

CREATE TABLE note_education_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    education_node_id UUID NOT NULL REFERENCES education_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(note_id, education_node_id)
);

CREATE INDEX idx_note_education_nodes_note ON note_education_nodes(note_id);
CREATE INDEX idx_note_education_nodes_node ON note_education_nodes(education_node_id);

-- Migrate existing relationships
INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, education_node_id FROM notes WHERE education_node_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, category_id FROM notes WHERE category_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, subcategory_id FROM notes WHERE subcategory_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, exam_id FROM notes WHERE exam_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, board_id FROM notes WHERE board_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, class_id FROM notes WHERE class_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, course_id FROM notes WHERE course_id IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO note_education_nodes (note_id, education_node_id)
SELECT id, subject_id FROM notes WHERE subject_id IS NOT NULL ON CONFLICT DO NOTHING;

-- Drop old columns
ALTER TABLE notes 
    DROP COLUMN education_node_id,
    DROP COLUMN category_id,
    DROP COLUMN subcategory_id,
    DROP COLUMN exam_id,
    DROP COLUMN board_id,
    DROP COLUMN class_id,
    DROP COLUMN course_id,
    DROP COLUMN subject_id;

-- Down Migration

ALTER TABLE notes
    ADD COLUMN education_node_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    ADD COLUMN category_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    ADD COLUMN subcategory_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    ADD COLUMN exam_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    ADD COLUMN board_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    ADD COLUMN class_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    ADD COLUMN course_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL,
    ADD COLUMN subject_id UUID REFERENCES education_nodes(id) ON DELETE SET NULL;

CREATE INDEX idx_notes_education_node ON notes(education_node_id);
CREATE INDEX idx_notes_exam ON notes(exam_id);
CREATE INDEX idx_notes_board ON notes(board_id);
CREATE INDEX idx_notes_class ON notes(class_id);
CREATE INDEX idx_notes_course ON notes(course_id);
CREATE INDEX idx_notes_subject ON notes(subject_id);

-- Note: We do not restore the data back into flattened columns in the down migration 
-- because multiple nodes may now map to a single note in ways that the old schema cannot support.

DROP TABLE IF EXISTS note_education_nodes CASCADE;
