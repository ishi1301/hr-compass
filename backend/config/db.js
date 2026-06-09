// const { Pool } = require("pg");

// const pool = new Pool({
//   user: "hardik",
//   host: "localhost",
//   database: "irctc_hr",
//   password: "",
//   port: 5432,
// });

// module.exports = pool;


const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;