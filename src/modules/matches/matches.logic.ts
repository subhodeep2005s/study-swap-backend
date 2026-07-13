import type { PoolClient } from "pg";

export interface PriorityBucket {
  targetNodeIds: string[];
  stateMatch: boolean | null;
  sourcePriority: number;
}

export async function resolvePriorityBuckets(client: PoolClient, userId: string): Promise<PriorityBucket[]> {
  // 1. Get user's leaf nodes
  const userNodesRes = await client.query('SELECT node_id FROM user_education_nodes WHERE user_id = $1', [userId]);
  const leafIds = userNodesRes.rows.map(r => r.node_id);

  if (leafIds.length === 0) return [];

  // 2. Fetch full path for each leaf node
  const pathsRes = await client.query(`
    WITH RECURSIVE node_path AS (
      SELECT id, parent_id, name, node_type, sort_order, id AS leaf_id, 1 AS depth
      FROM education_nodes
      WHERE id = ANY($1::uuid[])
      
      UNION ALL
      
      SELECT e.id, e.parent_id, e.name, e.node_type, e.sort_order, np.leaf_id, np.depth + 1
      FROM education_nodes e
      JOIN node_path np ON e.id = np.parent_id
    )
    SELECT * FROM node_path ORDER BY leaf_id, depth ASC;
  `, [leafIds]);

  // Group by leaf_id
  const pathsByLeaf = new Map<string, any[]>();
  for (const row of pathsRes.rows) {
    if (!pathsByLeaf.has(row.leaf_id)) pathsByLeaf.set(row.leaf_id, []);
    pathsByLeaf.get(row.leaf_id)!.push(row);
  }

  const buckets: PriorityBucket[] = [];

  for (const [leafId, path] of pathsByLeaf.entries()) {
    // path is ordered by depth ASC (leaf = 1, parent = 2, root = max)
    const root = path[path.length - 1];
    
    // Classify Stream based on root name or path structure
    if (root.name === 'School Education' || path.some(p => p.node_type === 'BOARD' || p.node_type === 'CLASS')) {
      // SCHOOL
      const cls = path.find(p => p.node_type === 'CLASS');
      const board = path.find(p => p.node_type === 'BOARD');
      const subject = path.find(p => p.node_type === 'SUBJECT');

      if (!cls || !board) continue; // fallback to exact match if corrupted

      // Fetch all subjects in same class
      const sameClassSubjects = await client.query('SELECT id FROM education_nodes WHERE parent_id = $1 AND node_type = $2', [cls.id, 'SUBJECT']);
      const sameClassIds = sameClassSubjects.rows.map(r => r.id);

      // Priority 1 & 2: Same Board, Same Class
      if (sameClassIds.length > 0) {
        buckets.push({ targetNodeIds: sameClassIds, stateMatch: true, sourcePriority: 1 });
        buckets.push({ targetNodeIds: sameClassIds, stateMatch: false, sourcePriority: 2 });
      }

      // Priority 3 & 4: Class -1, Class +1 (Same State)
      // Priority 5 & 6: Class -1, Class +1 (Diff State)
      const siblingClasses = await client.query(`
        SELECT id, sort_order FROM education_nodes 
        WHERE parent_id = $1 AND node_type = 'CLASS' AND sort_order IN ($2, $3)
      `, [board.id, cls.sort_order - 1, cls.sort_order + 1]);

      for (const sibling of siblingClasses.rows) {
        const siblingSubjects = await client.query('SELECT id FROM education_nodes WHERE parent_id = $1 AND node_type = $2', [sibling.id, 'SUBJECT']);
        const siblingSubjectIds = siblingSubjects.rows.map(r => r.id);
        if (siblingSubjectIds.length > 0) {
          if (sibling.sort_order < cls.sort_order) {
            // Class -1
            buckets.push({ targetNodeIds: siblingSubjectIds, stateMatch: true, sourcePriority: 3 });
            buckets.push({ targetNodeIds: siblingSubjectIds, stateMatch: false, sourcePriority: 5 });
          } else {
            // Class +1
            buckets.push({ targetNodeIds: siblingSubjectIds, stateMatch: true, sourcePriority: 4 });
            buckets.push({ targetNodeIds: siblingSubjectIds, stateMatch: false, sourcePriority: 6 });
          }
        }
      }

    } else if (root.name.includes('Competitive') || path.some(p => p.node_type === 'EXAM')) {
      // COMPETITIVE EXAMS
      const exam = path.find(p => p.node_type === 'EXAM') || path[0];
      const category = path.find(p => p.node_type === 'CATEGORY' && p.id !== root.id);

      // Priority 1 & 2: Same Exam
      buckets.push({ targetNodeIds: [exam.id], stateMatch: true, sourcePriority: 1 });
      buckets.push({ targetNodeIds: [exam.id], stateMatch: false, sourcePriority: 2 });

      if (category) {
        const categoryExams = await client.query('SELECT id FROM education_nodes WHERE parent_id = $1 AND node_type = $2', [category.id, 'EXAM']);
        const categoryExamIds = categoryExams.rows.map(r => r.id).filter(id => id !== exam.id); // exclude exact match
        if (categoryExamIds.length > 0) {
          buckets.push({ targetNodeIds: categoryExamIds, stateMatch: true, sourcePriority: 3 });
          buckets.push({ targetNodeIds: categoryExamIds, stateMatch: false, sourcePriority: 4 });
        }
      }
    } else {
      // GRADUATION / POST GRADUATION / DIPLOMA / OTHERS
      const leaf = path[0];
      const parent = path[1];
      const grandparent = path[2];

      // Priority 1 & 2: Same Leaf (Same Spec / Same Course)
      buckets.push({ targetNodeIds: [leaf.id], stateMatch: true, sourcePriority: 1 });
      buckets.push({ targetNodeIds: [leaf.id], stateMatch: false, sourcePriority: 2 });

      if (parent) {
        // Priority 3 & 4: Same Parent (Same Course, Diff Spec)
        const parentChildren = await client.query('SELECT id FROM education_nodes WHERE parent_id = $1', [parent.id]);
        const parentChildrenIds = parentChildren.rows.map(r => r.id).filter(id => id !== leaf.id);
        if (parentChildrenIds.length > 0) {
          buckets.push({ targetNodeIds: parentChildrenIds, stateMatch: true, sourcePriority: 3 });
          buckets.push({ targetNodeIds: parentChildrenIds, stateMatch: false, sourcePriority: 4 });
        }
        
        if (grandparent) {
          // Priority 5 & 6: Same Grandparent (Same Category, Diff Course)
          const gpChildren = await client.query('SELECT id FROM education_nodes WHERE parent_id = $1', [grandparent.id]);
          const siblingCourseIds = gpChildren.rows.map(r => r.id).filter(id => id !== parent.id);
          if (siblingCourseIds.length > 0) {
             const gpLeafs = await client.query('SELECT id FROM education_nodes WHERE parent_id = ANY($1::uuid[])', [siblingCourseIds]);
             const gpLeafIds = gpLeafs.rows.map(r => r.id);
             if (gpLeafIds.length > 0) {
                buckets.push({ targetNodeIds: gpLeafIds, stateMatch: true, sourcePriority: 5 });
                buckets.push({ targetNodeIds: gpLeafIds, stateMatch: false, sourcePriority: 6 });
             }
          }
        }
      }
    }
  }

  // Sort buckets by priority (1 to 6)
  buckets.sort((a, b) => a.sourcePriority - b.sourcePriority);
  
  return buckets;
}
