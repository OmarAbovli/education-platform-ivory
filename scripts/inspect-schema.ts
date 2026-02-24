import { sql } from "./server/db";

async function inspectSchema() {
    try {
        const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'videos';
    ` as { column_name: string, data_type: string }[];

        console.log("Videos table columns:");
        columns.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });
    } catch (e) {
        console.error("Failed to inspect schema:", e);
    }
}

inspectSchema();
