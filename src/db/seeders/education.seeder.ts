import { getClient } from "@/config/db";
import { logger } from "../../config/logger";

interface SeedNode {
  name: string;
  type: string; // 'CATEGORY', 'BOARD', 'EXAM', 'CLASS', 'COURSE', 'LEAF' etc.
  children?: SeedNode[];
}

const CLASSES_7_TO_12: SeedNode[] = [
  { name: "Class 7", type: "CLASS" },
  { name: "Class 8", type: "CLASS" },
  { name: "Class 9", type: "CLASS" },
  { name: "Class 10", type: "CLASS" },
  { name: "Class 11", type: "CLASS" },
  { name: "Class 12", type: "CLASS" },
];

const STATE_BOARDS = [
  "Andhra Pradesh Board", "Arunachal Pradesh Board", "Assam Board", "Bihar Board (BSEB)",
  "Chhattisgarh Board", "Goa Board", "Gujarat Board", "Haryana Board", "Himachal Pradesh Board",
  "Jammu & Kashmir Board", "Jharkhand Board", "Karnataka Board", "Kerala Board",
  "Madhya Pradesh Board", "Maharashtra Board", "Manipur Board", "Meghalaya Board",
  "Mizoram Board", "Nagaland Board", "Odisha Board", "Punjab Board", "Rajasthan Board",
  "Sikkim Board", "Tamil Nadu Board", "Telangana Board", "Tripura Board", "Uttar Pradesh Board",
  "Uttarakhand Board", "West Bengal Board"
];

const INDIA_HIERARCHY: SeedNode[] = [
  {
    name: "School Education",
    type: "CATEGORY",
    children: [
      {
        name: "National Boards",
        type: "SUB_CATEGORY",
        children: [
          { name: "CBSE", type: "BOARD", children: CLASSES_7_TO_12 },
          { name: "CISCE (ICSE - Class 10)", type: "BOARD", children: CLASSES_7_TO_12 },
          { name: "CISCE (ISC - Class 12)", type: "BOARD", children: CLASSES_7_TO_12 },
          { name: "NIOS", type: "BOARD", children: CLASSES_7_TO_12 },
        ]
      },
      {
        name: "State Boards",
        type: "SUB_CATEGORY",
        children: STATE_BOARDS.map(board => ({
          name: board,
          type: "BOARD",
          children: CLASSES_7_TO_12
        }))
      }
    ]
  },
  {
    name: "National Competitive Exams",
    type: "CATEGORY",
    children: [
      {
        name: "Engineering & Medical",
        type: "SUB_CATEGORY",
        children: [
          {
            name: "Engineering",
            type: "GROUP",
            children: [
              "JEE Main", "JEE Advanced", "BITSAT", "VITEEE", "SRMJEEE", "COMEDK UGET",
              "WBJEE", "MHT CET", "KCET", "KEAM", "AP EAMCET (AP EAPCET)", "TS EAMCET (TG EAPCET)",
              "GUJCET", "OJEE", "CG PET", "UPCET (where applicable)", "HPCET", "BCECE",
              "IPU CET", "CUSAT CAT", "KIITEE", "SAAT", "LPUNEST"
            ].map(name => ({ name, type: "EXAM" }))
          },
          {
            name: "Medical",
            type: "GROUP",
            children: [
              "NEET UG", "NEET PG", "INI-CET", "INI-SS", "AIIMS Nursing", "NORCET",
              "GPAT", "NEET MDS", "NEET SS"
            ].map(name => ({ name, type: "EXAM" }))
          }
        ]
      },
      {
        name: "Nursing, Pharmacy, Agriculture & Veterinary",
        type: "SUB_CATEGORY",
        children: [
          { name: "Nursing", type: "GROUP", children: ["AIIMS Nursing", "PGIMER Nursing", "JIPMER Nursing", "State Nursing Entrance Exams"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Pharmacy", type: "GROUP", children: ["GPAT", "State Pharmacy Entrance Exams"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Agriculture", type: "GROUP", children: ["ICAR AIEEA UG", "ICAR AIEEA PG", "State Agriculture Entrance Exams"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Veterinary", type: "GROUP", children: ["NEET UG (where applicable)", "Veterinary University Entrance Exams"].map(n => ({ name: n, type: "EXAM" })) },
        ]
      },
      {
        name: "Architecture, Design, Fashion & Fine Arts",
        type: "SUB_CATEGORY",
        children: [
          { name: "Architecture", type: "GROUP", children: ["NATA", "JEE Main Paper 2"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Design", type: "GROUP", children: ["NID DAT", "UCEED", "CEED", "NIFT Entrance Exam"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Hotel Management", type: "GROUP", children: [{ name: "NCHM JEE", type: "EXAM" }] },
          { name: "Fashion", type: "GROUP", children: ["NIFT Entrance", "Pearl Academy Entrance"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Fine Arts", type: "GROUP", children: ["BHU Fine Arts", "MSU Fine Arts", "State Fine Arts Entrance"].map(n => ({ name: n, type: "EXAM" })) }
        ]
      },
      {
        name: "Law, Management & Commerce",
        type: "SUB_CATEGORY",
        children: [
          { name: "Law", type: "GROUP", children: ["CLAT UG", "CLAT PG", "AILET", "SLAT", "MHCET Law", "LSAT (if applicable)"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Management", type: "GROUP", children: ["CAT", "XAT", "MAT", "CMAT", "SNAP", "NMAT", "IIFT MBA", "TISSNET (if applicable)", "ATMA"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Commerce", type: "GROUP", children: ["CA Foundation", "CA Intermediate", "CA Final", "CMA Foundation", "CMA Intermediate", "CMA Final", "CS Executive Entrance Test (CSEET)", "CS Executive", "CS Professional"].map(n => ({ name: n, type: "EXAM" })) }
        ]
      },
      {
        name: "Government Services, Banking & Defense",
        type: "SUB_CATEGORY",
        children: [
          { name: "Civil Services", type: "GROUP", children: ["UPSC CSE", "Indian Forest Service", "Engineering Services (ESE)", "CDS", "NDA", "CAPF", "EPFO", "CMS", "IES/ISS", "Geo-Scientist"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "SSC", type: "GROUP", children: ["CGL", "CHSL", "CPO", "MTS", "GD Constable", "JE", "Selection Post", "Stenographer", "JHT"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Banking", type: "GROUP", children: ["SBI PO", "SBI Clerk", "SBI SO", "IBPS PO", "IBPS Clerk", "IBPS SO", "IBPS RRB PO", "IBPS RRB Clerk", "RBI Grade B", "RBI Assistant", "NABARD", "SIDBI"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Insurance", type: "GROUP", children: ["LIC AAO", "LIC ADO", "LIC HFL", "NIACL AO", "NICL AO", "UIIC AO"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Railways", type: "GROUP", children: ["RRB NTPC", "RRB Group D", "RRB JE", "RPF SI", "RPF Constable", "ALP"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Defence", type: "GROUP", children: ["AFCAT", "Agniveer Army", "Agniveer Navy", "Agniveer Air Force", "Indian Coast Guard", "Territorial Army"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Teaching", type: "GROUP", children: ["CTET", "UGC NET", "CSIR NET", "NTA NET", "KVS", "NVS", "DSSSB Teaching"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Judiciary", type: "GROUP", children: ["Judicial Services", "APO", "High Court Exams"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Research", type: "GROUP", children: ["GATE", "JAM", "JEST", "NBHM", "CSIR NET", "UGC NET", "ICMR JRF", "DBT BET", "GAT-B"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "Defence Research", type: "GROUP", children: ["DRDO CEPTAM", "ISRO", "BARC", "NPCIL"].map(n => ({ name: n, type: "EXAM" })) },
          { name: "PSU", type: "GROUP", children: ["ONGC", "IOCL", "BPCL", "HPCL", "GAIL", "SAIL", "BEL", "BHEL", "NTPC", "Coal India"].map(n => ({ name: n, type: "EXAM" })) }
        ]
      }
    ]
  },
  {
    name: "State Competitive Exams",
    type: "CATEGORY",
    children: [
      "PSC", "Civil Services", "Police SI", "Police Constable", "Forest Guard", "Forest Ranger",
      "Jail Prahari", "Patwari", "Revenue Inspector", "Teacher Eligibility Test", "High Court",
      "Civil Judge", "Assistant Professor", "Nursing Officer", "Lab Technician", "Pharmacist",
      "Engineering Services", "Medical Officer", "Food Safety Officer", "Excise", "Transport",
      "Municipality", "Gram Panchayat", "Group C / Group D"
    ].map(name => ({ name, type: "EXAM" }))
  },
  {
    name: "Graduation",
    type: "CATEGORY",
    children: [
      { name: "Medical & Allied Health", type: "SUB_CATEGORY", children: ["MBBS", "BDS", "BAMS", "BHMS", "BUMS", "BSMS", "BNYS", "BPT", "BOT", "BASLP", "BSc Nursing", "Post Basic BSc Nursing", "GNM", "ANM", "B.Pharm", "Pharm D", "BMLT", "BMIT", "BSc Radiology", "BSc Optometry", "BSc Dialysis Technology", "BSc OT Technology", "Public Health"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Engineering & Tech", type: "SUB_CATEGORY", children: ["B.Tech", "BE", "All engineering branches"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Science", type: "SUB_CATEGORY", children: ["All BSc specializations"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Commerce & Management", type: "SUB_CATEGORY", children: ["BCom", "BBA", "BMS", "Finance", "Banking"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Arts", type: "SUB_CATEGORY", children: ["BA", "All Humanities subjects"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Law", type: "SUB_CATEGORY", children: ["LLB", "BA LLB", "BBA LLB", "BCom LLB"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Agriculture", type: "SUB_CATEGORY", children: ["Agriculture", "Horticulture", "Forestry", "Fisheries", "Dairy", "Food Technology"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Design", type: "SUB_CATEGORY", children: ["B.Des", "Animation", "Fashion", "Interior", "Graphic"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Others", type: "SUB_CATEGORY", children: ["Journalism", "Hotel Management", "Aviation", "Tourism", "Social Work", "Library Science"].map(n => ({ name: n, type: "COURSE" })) }
    ]
  },
  {
    name: "Post Graduation",
    type: "CATEGORY",
    children: [
      "MD", "MS", "DM", "MCh", "MDS", "MBA", "MCA", "MTech", "ME", "MSc", "MCom", "MA", "LLM", "MPharm", "MPH", "MPT", "MDes", "MVSc", "MEd", "MSW"
    ].map(name => ({ name, type: "COURSE" }))
  },
  {
    name: "Diplomas",
    type: "CATEGORY",
    children: [
      { name: "Technical & Engineering", type: "SUB_CATEGORY", children: ["Polytechnic", "ITI", "Diploma Engineering (Computer, Mechanical, Civil, Electrical, Electronics)"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Medical & Allied Health", type: "SUB_CATEGORY", children: ["ANM", "GNM", "D.Pharm", "Radiology", "Lab Technician", "Operation Theatre", "Dialysis", "Optometry"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Vocational & Creative", type: "SUB_CATEGORY", children: ["Hotel Management", "Fashion", "Interior Design", "Animation", "Multimedia", "Agriculture", "Fire & Safety", "Aviation", "Digital Marketing"].map(n => ({ name: n, type: "COURSE" })) }
    ]
  },
  {
    name: "Research & PhD",
    type: "CATEGORY",
    children: [
      { name: "Framework", type: "SUB_CATEGORY", children: ["PhD", "Integrated PhD", "MPhil (legacy)", "Research Scholar"].map(n => ({ name: n, type: "COURSE" })) },
      { name: "Competencies", type: "SUB_CATEGORY", children: ["Thesis Writing", "Journal Pub Hello World!"].map(n => ({ name: n, type: "COURSE" })) }
    ]
  }
];

const INTERNATIONAL_HIERARCHY: SeedNode[] = [
  {
    name: "English Proficiency",
    type: "CATEGORY",
    children: ["IELTS", "TOEFL", "PTE", "OET", "Duolingo", "CELPIP"].map(n => ({ name: n, type: "EXAM" }))
  },
  {
    name: "Study Abroad",
    type: "CATEGORY",
    children: ["SAT", "ACT", "GRE", "GMAT", "LSAT", "MCAT", "DAT", "PCAT"].map(n => ({ name: n, type: "EXAM" }))
  },
  {
    name: "Medical Licensing",
    type: "CATEGORY",
    children: ["USMLE", "PLAB", "AMC", "DHA", "HAAD", "MOH UAE", "NCLEX", "Prometric"].map(n => ({ name: n, type: "EXAM" }))
  },
  {
    name: "Finance",
    type: "CATEGORY",
    children: ["CFA", "FRM", "ACCA", "CPA", "CIMA"].map(n => ({ name: n, type: "EXAM" }))
  }
];

async function seedRecursive(
  nodes: SeedNode[],
  parentId: string | null,
  countryId: string | null,
  client: any,
  sortOrderStart = 0
) {
  let order = sortOrderStart;
  for (const node of nodes) {
    // Generate a unique deterministic ID constraint (we don't have one, so we'll match by name and parent_id)
    // Coalesce parent_id because it can be null
    let res;
    if (parentId) {
      res = await client.query(
        `SELECT id FROM education_nodes WHERE country_id = $1 AND parent_id = $2 AND name = $3`,
        [countryId, parentId, node.name]
      );
      if (res.rows.length === 0) {
        res = await client.query(
          `INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [countryId, parentId, node.name, node.type, order]
        );
      }
    } else {
      res = await client.query(
        `SELECT id FROM education_nodes WHERE country_id = $1 AND parent_id IS NULL AND name = $2`,
        [countryId, node.name]
      );
      if (res.rows.length === 0) {
        res = await client.query(
          `INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order)
           VALUES ($1, NULL, $2, $3, $4)
           RETURNING id`,
          [countryId, node.name, node.type, order]
        );
      }
    }

    const nodeId = res.rows[0].id;

    if (node.children && node.children.length > 0) {
      await seedRecursive(node.children, nodeId, countryId, client, 0);
    }
    order++;
  }
}

export async function runEducationSeeder() {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    logger.info("Seeding Education Directory...");

    // First ensure India exists
    let indiaRes = await client.query(`SELECT id FROM countries WHERE name = 'India'`);
    if (indiaRes.rows.length === 0) {
      indiaRes = await client.query(
        `INSERT INTO countries (name, flag) VALUES ('India', '🇮🇳') RETURNING id`
      );
    }
    const indiaId = indiaRes.rows[0].id;

    // Seed India specific hierarchy
    await seedRecursive(INDIA_HIERARCHY, null, indiaId, client);
    logger.info("Seeded India Education Hierarchy");

    // Get all countries to seed international data
    const countriesRes = await client.query(`SELECT id FROM countries`);
    for (const country of countriesRes.rows) {
      await seedRecursive(INTERNATIONAL_HIERARCHY, null, country.id, client);
    }
    logger.info("Seeded International Education Hierarchy for all countries");

    await client.query("COMMIT");
    logger.info("Education Directory seeding completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ error }, "Failed to seed Education Directory");
    throw error;
  } finally {
    client.release();
  }
}

// Allow running directly
if (require.main === module) {
  runEducationSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
