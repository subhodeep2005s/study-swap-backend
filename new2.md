# Dynamic Education Directory - Full Frontend Implementation Guide

This guide is for the Frontend Developers (React, React Native, Next.js, etc.) building the Student App, Mentor App, and Admin Panel. The backend has migrated from a simple flat `exams` table to a fully dynamic hierarchical `education_nodes` tree structure.

## Overview of the New System

The database now uses an `education_nodes` table where nodes can have parents. This enables infinite flexibility to support ANY educational pathway, not just schools!

**Examples of Hierarchies:**
1. **Schooling:** `Country (India) -> Board (CBSE) -> Class (Class 10) -> Subject (Mathematics)`
2. **University/College:** `Country (India) -> University (Delhi University) -> Degree (B.Tech) -> Specialization (Computer Science) -> Semester (Sem 1)`
3. **Competitive Exams:** `Country (India) -> Category (Medical) -> Exam (NEET) -> Subject (Biology)`
- **Root Node:** A node with `parentId = null`. Usually, these represent top-level entities (like Boards or Universities) under a specific Country.
- **Child Node:** A node with a `parentId`.
- **Leaf Node:** A node that has NO children. **These are the only nodes users should ultimately select.**

---

## 1. Student App Implementation (Onboarding & Profile)

During student onboarding or profile editing, the student must select their educational background by drilling down the tree.

### Step-by-Step Flow

1. **Step 1: Select Country**
   - Call `GET /countries`.
   - The user selects a country (e.g., India). Keep the `countryId` in state.

2. **Step 2: Fetch ALL Education Nodes for that Country (Single API Call)**
   - Call `GET /exams/{countryId}`
   - ⚠️ **This returns a FLAT ARRAY, not a nested tree.** Every node in the response has an `id`, `parent_id`, `name`, `node_type`, and `sort_order`.
   - **Store this entire array in local state.** You will NOT make any more API calls. All drill-down happens locally by filtering this array.
   - **Example API Response:**
     ```json
     [
       { "id": "aaa", "parent_id": null, "name": "School Education", "node_type": "CATEGORY", "sort_order": 0 },
       { "id": "bbb", "parent_id": "aaa", "name": "CBSE", "node_type": "BOARD", "sort_order": 0 },
       { "id": "ccc", "parent_id": "bbb", "name": "Class 10", "node_type": "CLASS", "sort_order": 3 },
       { "id": "ddd", "parent_id": "ccc", "name": "Mathematics", "node_type": "SUBJECT", "sort_order": 0 },
       { "id": "eee", "parent_id": null, "name": "Graduation", "node_type": "CATEGORY", "sort_order": 1 },
       { "id": "fff", "parent_id": "eee", "name": "B.Tech", "node_type": "COURSE", "sort_order": 0 }
     ]
     ```

3. **Step 3: Display Root Nodes (First Screen)**
   - Filter locally: `nodes.filter(node => node.parent_id === null)`.
   - This gives root categories like "School Education", "Graduation", "National Competitive Exams".
   - The user taps one (e.g., "School Education").

4. **Step 4: Drill Down (Recursive Filtering from Local State)**
   - Once "School Education" is selected, filter again: `nodes.filter(node => node.parent_id === SCHOOL_EDUCATION_ID)`.
   - This gives sub-categories like "National Boards", "State Boards".
   - User taps "National Boards" → filter again → shows "CBSE", "ICSE", "NIOS".
   - User taps "CBSE" → filter again → shows "Class 7", "Class 8", ... "Class 12".
   - User taps "Class 10" → filter again → if empty, "Class 10" IS the leaf.

5. **Step 5: Reach Leaf Nodes (Final Selection)**
   - Filter for children of "Class 10": `nodes.filter(node => node.parent_id === CLASS_10_ID)`.
   - If the children array has items (e.g., "Math", "Science"), show them and allow **MULTI-SELECT**.
   - If the children array is **EMPTY**, "Class 10" itself is the leaf node — allow the user to select it directly.

6. **Step 6: Submitting Data**
   - Collect the IDs of all selected Leaf Nodes.
   - Send them to the backend:
     ```json
     // PATCH /onboarding/education-nodes
     {
       "educationNodeIds": ["<MATH_NODE_ID>", "<SCIENCE_NODE_ID>"]
     }
     ```

### Handling Unknown Depths (Dynamic Rendering)
Since the new architecture supports an **infinite** number of levels (e.g., `Country -> University -> Degree -> Branch -> Subject`), the frontend **CANNOT** hardcode a fixed 3-step wizard (like "Select Board, Select Class, Select Subject").
- **Dynamic Stepper:** Instead, implement a dynamic stack or drill-down component. 
- **Recursive Logic:**
  1. Fetch children of the currently selected node.
  2. If the children array has items, push a new "Step" to the UI stack and render those children as a list.
  3. Keep rendering new lists until a node returns `[]` (an empty array) for its children.
  4. Once `[]` is returned, treat the items in that final list as the "Leaf Nodes" and switch the UI to allow multi-selection checkboxes.
- **Breadcrumbs:** Implement a breadcrumb trail (e.g., `CBSE > Class 10 > ...`) so the user can see their current depth and navigate backwards dynamically.

### Frontend Edge Cases to Handle for Students
- **No Children Present (Empty Branch):** If a user clicks a node (e.g., "General Knowledge Exam") and `nodes.filter(n => n.parentId === selectedId)` returns `[]` (an empty array), the frontend MUST immediately recognize this node as a Leaf Node and allow them to select it directly.
- **Back Navigation / Unselecting a Parent:** If a user is on Step 4 but clicks "Back" and changes their Board from "CBSE" to "ICSE", you **MUST** clear all selected child nodes (like Class 10 and Math) from the local state. Otherwise, you'll submit mismatched hierarchy data.
- **Offline / Loading:** Fetch the entire tree for the country once at the start of onboarding. Cache it in Memory/Zustand/Redux so drill-downs are instant without loading spinners.

---

## 2. Mentor App Implementation (Onboarding & Profile)

Mentors define what subjects/exams they can teach. This uses the exact same `education_nodes` tree.

### Step-by-Step Flow
- The UI flow is **identical** to the Student App. 
- Use the same recursive drill-down component.
- **Endpoint:** Mentors submit their selected node IDs during their application step (`POST /onboarding/mentor-application` or `PATCH /mentors/me`).

### Handling Mentor Matching
- The frontend **does not** need to do anything special for matching.
- The backend matches students and mentors automatically based on intersections of their `user_education_nodes`. If the mentor selected the exact same nodes as the student, they will appear in the student's matchmaking feed.

### Frontend Edge Cases to Handle for Mentors
- **Minimum Selection Requirement:** A mentor *must* select at least one node. The UI should disable the "Continue" button if `selectedNodes.length === 0`.
- **Node Deletions by Admin:** If an Admin deletes a node, it vanishes from the database. When a mentor views their profile, the frontend might encounter an ID that no longer exists in the `/education-nodes` response. The UI should gracefully drop unknown IDs and prompt the mentor: *"Some of your subjects were updated. Please review your expertise."*

---

## 3. Admin Panel Implementation (Managing the Tree)

The Admin is responsible for building this tree dynamically.

### CRUD Operations for Education Nodes

1. **Viewing the Tree (Read)**
   - Call `GET /admin/education-nodes`.
   - The frontend should map the flat array into a nested JSON object by linking `parentId` to `id`.
   - Use a UI component like `rc-tree` or MUI TreeView to display the collapsible hierarchy.

2. **Creating Nodes (Create)**
   - When the admin clicks "Add Node" at the root level:
     - Form payload: `{ "countryId": "<ID>", "parentId": null, "name": "CBSE", "nodeType": "BOARD", "isActive": true }`
   - When the admin clicks "Add Sub-Node" under "CBSE":
     - Form payload: `{ "countryId": "<ID>", "parentId": "<CBSE_NODE_ID>", "name": "Class 10", "nodeType": "CLASS", "isActive": true }`

3. **Updating Nodes (Update)**
   - Form payload: `PATCH /admin/education-nodes/{id}` with new names or changing `isActive`.
   - Changing `isActive` to `false` should ideally be visualized as "grayed out" in the Tree UI.

4. **Deleting Nodes (Delete - EXTREMELY DANGEROUS)**
   - `DELETE /admin/education-nodes/{id}`
   - **Backend Behavior:** The database uses `ON DELETE CASCADE`. If an admin deletes "CBSE", **ALL** classes and subjects under CBSE are instantly deleted. Furthermore, it wipes those nodes from all Students and Mentors who selected them.

### Frontend Edge Cases to Handle for Admins
- **Delete Confirmation Warning:** The frontend MUST intercept any delete action on a node that has children. Show a red modal: *"WARNING: You are deleting a parent node. This will PERMANENTLY delete all nested sub-categories and forcefully remove them from all users' profiles. Type 'CONFIRM' to proceed."*
- **Moving Nodes (Parent Swap):** To move a node (e.g., move a subject from Class 10 to Class 11), the frontend just sends `PATCH /admin/education-nodes/{id}` with `"parentId": "<CLASS_11_ID>"`.
- **Pagination Caveat:** For building the tree visually, the Admin panel should fetch nodes with a high `limit` (e.g., `?limit=1000`) so the entire tree can be constructed synchronously on the frontend.
