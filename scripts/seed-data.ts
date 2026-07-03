

const TOKEN = process.env.ADMIN_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCIsImVtYWlsIjoiYWRtaW5AbmV0cGllZGV2LmluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgyOTIzODcxLCJleHAiOjE3ODM1Mjg2NzF9.DbWT46GL_FEwL8tWw9QgX_gCFrABKPP9Awml4uIZN6I";
const API_URL = "http://localhost:8000/api";

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
  { flag: "🇳🇿", name: "New Zealand", isoCode: "NZ", exams: ["NCEA", "UCAT ANZ", "IELTS", "NZREX Clinical", "NZCEL"] },
  { flag: "🇧🇩", name: "Bangladesh", isoCode: "BD", exams: [] }
];

async function seed() {
  console.log("Starting seed process...");

  // Fetch existing countries to avoid duplicates
  const existingCountriesRes = await fetch(`${API_URL}/admin/countries`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
  });
  const existingCountriesJson = await existingCountriesRes.json() as any;
  const existingCountries = existingCountriesJson.success ? existingCountriesJson.data.countries : [];

  for (const countryData of data) {
    try {
      const existing = existingCountries.find((c: any) => c.name === countryData.name);
      let countryId;

      if (existing) {
        console.log(`Updating country: ${countryData.name}`);
        const updateRes = await fetch(`${API_URL}/admin/countries/${existing.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN}`
          },
          body: JSON.stringify({ isoCode: countryData.isoCode })
        });
        countryId = existing.id;
      } else {
        console.log(`Creating country: ${countryData.name} ${countryData.flag}`);
        const countryRes = await fetch(`${API_URL}/admin/countries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN}`
          },
          body: JSON.stringify({ name: countryData.name, flag: countryData.flag, isoCode: countryData.isoCode })
        });
        
        const countryJson = await countryRes.json() as any;
        if (!countryRes.ok || !countryJson.success) {
          console.error(`Failed to create country ${countryData.name}:`, countryJson);
          continue;
        }
        countryId = countryJson.data.country.id;
        console.log(`✅ Created country ${countryData.name} with ID: ${countryId}`);
      }
      // Fetch existing exams to avoid duplicates
      const existingExamsRes = await fetch(`${API_URL}/admin/exams`, {
        headers: { "Authorization": `Bearer ${TOKEN}` }
      });
      const existingExamsJson = await existingExamsRes.json() as any;
      const existingExams = existingExamsJson.success ? existingExamsJson.data.exams : [];

      // Create Exams for Country
      for (const examName of countryData.exams) {
        if (existingExams.some((e: any) => e.name === examName && e.country_id === countryId)) {
          continue;
        }
        const examRes = await fetch(`${API_URL}/admin/exams`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN}`
          },
          body: JSON.stringify({ countryId, name: examName, isActive: true })
        });
        
        const examJson = await examRes.json() as any;
        if (!examRes.ok || !examJson.success) {
          console.error(`  ❌ Failed to create exam ${examName} for ${countryData.name}:`, examJson);
        } else {
          console.log(`  ✅ Created exam: ${examName}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${countryData.name}:`, err);
    }
  }

  console.log("Seed process completed.");
}

seed();
