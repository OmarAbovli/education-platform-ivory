const { neon } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkSchema() {
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `;
    console.log("Users Table Columns:");
    columns.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));

    const quizzes = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quizzes'
    `;
    console.log("\nQuizzes Table Columns:");
    quizzes.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));

    const questions = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'questions'
    `;
    console.log("\nQuestions Table Columns:");
    questions.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
  } catch (err) {
    console.error("Error checking schema:", err);
  }
}

checkSchema();
