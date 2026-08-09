import { query, closePool } from "../src/config/db";

const data = [
  { flag: "🇮🇳", name: "India", isoCode: "IN", exams: ["UPSC", "SSC", "JEE", "NEET", "GATE", "CAT", "CLAT", "CUET", "UGC NET", "Bank PO"] },
  { flag: "🇺🇸", name: "United States", isoCode: "US", exams: ["SAT", "ACT", "GRE", "GMAT", "MCAT", "LSAT", "USMLE", "CPA", "NCLEX", "Bar Exam"] },
  { flag: "🇬🇧", name: "United Kingdom", isoCode: "GB", exams: ["GCSE", "A-Level", "UCAT", "GAMSAT", "LNAT", "BMAT", "SQE", "ACCA", "IELTS UKVI"] },
  { flag: "🇨🇦", name: "Canada", isoCode: "CA", exams: ["MCAT", "LSAT", "NCLEX-RN", "CPA Canada", "CELPIP", "IELTS", "Canadian Citizenship Test"] },
  { flag: "🇦🇺", name: "Australia", isoCode: "AU", exams: ["ATAR", "UCAT ANZ", "GAMSAT", "HSC", "VCE", "PTE Academic", "IELTS"] },
  { flag: "🇩🇪", name: "Germany", isoCode: "DE", exams: ["TestAS", "TMS", "DSH", "TestDaF", "Goethe-Zertifikat", "Staatsexamen"] },
  { flag: "🇸🇬", name: "Singapore", isoCode: "SG", exams: ["PSLE", "O-Level", "A-Level", "NUS Admissions", "NTU Admissions", "IELTS"] },
  { flag: "🇯🇵", name: "Japan", isoCode: "JP", exams: ["EJU", "JLPT", "National Center Test (Common Test)", "JET Programme Selection"] },
  { flag: "🇰🇷", name: "South Korea", isoCode: "KR", exams: ["CSAT (Suneung)", "TOPIK", "Korean Bar Exam", "Civil Service Exam"] },
  { flag: "🇳🇿", name: "New Zealand", isoCode: "NZ", exams: ["NCEA", "UCAT ANZ", "IELTS", "NZREX Clinical", "NZCEL"] }
];

async function seed() {
  console.log("Starting seed process...");

  for (const countryData of data) {
    try {
      // Upsert Country
      const countryRes = await query(
        `INSERT INTO countries (name, flag, iso_code) 
         VALUES ($1, $2, $3)
         RETURNING id`,
        [countryData.name, countryData.flag, countryData.isoCode]
      );
      const countryId = countryRes.rows[0].id;
      console.log(`✅ Upserted country ${countryData.name}`);

      for (let i = 0; i < countryData.exams.length; i++) {
        const examName = countryData.exams[i];
        
        // Check if node exists
        const nodeRes = await query(
          `SELECT id FROM education_nodes WHERE country_id = $1 AND name = $2 AND node_type = 'EXAM'`,
          [countryId, examName]
        );

        if (nodeRes.rows.length === 0) {
          await query(
            `INSERT INTO education_nodes (country_id, name, node_type, is_active, sort_order)
             VALUES ($1, $2, 'EXAM', true, $3)`,
            [countryId, examName, i]
          );
          console.log(`  ✅ Created exam node: ${examName}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${countryData.name}:`, err);
    }
  }

  console.log("Seed process completed.");
  await closePool();
}

seed();
