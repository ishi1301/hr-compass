const express = require("express");
const cors = require("cors");

const pool = require("./config/db");

const app = express();

const { types } = require("pg");

// 1082 = DATE type in Postgres
types.setTypeParser(1082, (val) => val);

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error("DB ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

app.post("/employees", async (req, res) => {
  try {
    const {
      employeeId,
      name,
      location,
      department,
      joiningDate,
      status,
      zone,
      exitDate, // ✅ ADD THIS
    } = req.body;

    await pool.query(
      `INSERT INTO employees 
      (employee_id, name, location, department, joining_date, status, zone, date_of_exit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        employeeId,
        name,
        location,
        department,
        joiningDate,
        status,
        zone,
        exitDate || null, // ✅ IMPORTANT
      ],
    );

    res.send("Employee added successfully");
  } catch (err) {
    console.error("DB ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

app.get("/employees", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM employees");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching employees");
  }
});

app.get("/attendance", async (req, res) => {
  try {
    const db = await pool.query("SELECT current_database()");
    const count = await pool.query("SELECT COUNT(*) FROM attendance");

    const result = await pool.query(`
  SELECT 
    a.*,
    e.name,
    e.department,
    e.zone
  FROM attendance a
  LEFT JOIN employees e
  ON a.employee_id = e.employee_id
`);

    // ✅ FIX: convert date properly (NO timezone shift)
    const fixed = result.rows.map((r) => ({
      ...r,
      // date: r.date.toISOString().split("T")[0],
      date: r.date,
    }));

    res.json({
      database: db.rows[0].current_database,
      count: count.rows[0].count,
      data: fixed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(5001, () => {
  console.log("Server running on port 5001");
});

app.put("/employees/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const { name, location, department, joiningDate, status, zone, exitDate } =
      req.body;

    await pool.query(
      `UPDATE employees
       SET name=$1,
           location=$2,
           department=$3,
           joining_date=$4,
           status=$5,
           zone=$6,
           date_of_exit=$7
       WHERE employee_id=$8`,
      [
        name,
        location,
        department,
        joiningDate,
        status,
        zone,
        status === "inactive" ? exitDate : null, // ✅ IMPORTANT
        id,
      ],
    );

    res.send("Employee updated successfully");
  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

app.delete("/employees/:id", async (req, res) => {
  try {
    const id = req.params.id;

    await pool.query("DELETE FROM employees WHERE employee_id = $1", [id]);

    res.send("Employee deleted successfully");
  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

app.post("/bonus", async (req, res) => {
  try {
    const { employeeId, year, amount, reason } = req.body;

    await pool.query(
      `INSERT INTO bonus (employee_id, year, amount, reason)
       VALUES ($1, $2, $3, $4)`,
      [employeeId, year, amount, reason],
    );

    res.send("Bonus added successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding bonus");
  }
});

app.get("/bonus", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bonus");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching bonus");
  }
});

app.post("/attendance", async (req, res) => {
  try {
    const records = req.body;

    for (let r of records) {
      if (!r.employeeId || r.employeeId.trim() === "") {
        console.log("Skipping invalid record:", r); // ✅ debug
        continue; // 🚫 skip bad data
      }

      await pool.query(
        `INSERT INTO attendance 
    (employee_id, date, login_time, logout_time, working_hours, status)
    VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          r.employeeId.trim(),
          r.date.split("T")[0],
          r.loginTime,
          r.logoutTime,
          r.workingHours,
          r.status,
        ],
      );
    }

    res.json({
      message: "Attendance saved",
      count: records.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving attendance");
  }
});

app.get("/check-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT current_database()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
