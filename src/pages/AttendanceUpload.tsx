import React, { useState, useEffect } from "react";
import { useRef, useMemo } from "react";
import { getHolidays } from "@/lib/store";

import {
  getAttendance,
  setAttendance,
  getEmployees,
  AttendanceRecord,
  getAuthRole,
  getAuthZone,
  ZONES,
} from "@/lib/store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const role = getAuthRole();
const userZone = getAuthZone();
const isRoot = role === "root";

export default function AttendanceUpload() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const res = await fetch("http://localhost:5001/attendance"); //
        const response = await res.json();

        console.log("RAW API:", response); // 👈 IMPORTANT

        let rows = [];

        if (Array.isArray(response)) {
          rows = response;
        } else if (Array.isArray(response.data)) {
          rows = response.data;
        }

        console.log("ROWS:", rows); // 👈 IMPORTANT

        const mapped = rows.map((r: any) => ({
          employeeId: String(r.employee_id).trim(),
          name: r.name,
          department: r.department,
          date: r.date,
          loginTime: r.login_time || "",
          logoutTime: r.logout_time || "",
          workingHours: Number(r.working_hours || 0),
          status: r.status,
        }));

        console.log("MAPPED:", mapped); // 👈 IMPORTANT

        setRecords(mapped);
      } catch (err) {
        console.error("FETCH ERROR:", err);
      }
    };

    loadAttendance();
  }, []);

  useEffect(() => {
    const data = getHolidays();
    setHolidays(data);
  }, []);

  // useEffect(() => {
  //   const loadAttendance = async () => {
  //     const res = await fetch("http://localhost:5001/attendance");
  //     const data = await res.json();

  //     const rows = data.data || data;

  //     const mapped = rows.map((r: any) => ({
  //       employeeId: String(r.employee_id).trim(),
  //       date: new Date(r.date).toISOString().split("T")[0],
  //       loginTime: r.login_time || "",
  //       logoutTime: r.logout_time || "",
  //       workingHours: Number(r.working_hours || 0),
  //       status: r.status,
  //     }));

  //     console.log("LOADED FROM DB:", mapped);

  //     setRecords(mapped);
  //   };

  //   loadAttendance();
  // }, []);

  // console.log("UI RECORDS:", records);

  // // useEffect(() => {
  // //   fetch("http://localhost:5001/attendance")
  // //     .then((res) => res.json())
  // //     .then((data) => {
  // //       const formatted = data.map((r: any) => ({
  // //         employeeId: r.employee_id,
  // //         date: r.date.split("T")[0],
  // //         loginTime: r.login_time,
  // //         logoutTime: r.logout_time,
  // //         workingHours: r.working_hours,
  // //         status: r.status,
  // //       }));
  // //       setRecords(formatted);
  // //     });
  // // }, []);

  // useEffect(() => {
  //   const loadAttendance = async () => {
  //     try {
  //       const res = await fetch("http://localhost:5001/attendance");
  //       const data = await res.json();

  //       console.log("RAW API DATA:", data); // ✅ DEBUG 1

  //       const formatted = data.map((r: any) => {
  //         const employeeId = String(r.employee_id).trim();
  //         const emp = allEmployees.find(
  //           (e) => e.employeeId.trim() === employeeId,
  //         );
  //         return {
  //           employeeId,
  //           name: emp?.name || "—",
  //           department: emp?.department || "—",
  //           date: new Date(r.date).toISOString().split("T")[0],
  //           loginTime: r.login_time || "",
  //           logoutTime: r.logout_time || "",
  //           workingHours: isNaN(Number(r.working_hours))
  //             ? 0
  //             : Number(r.working_hours),
  //           status: r.status,
  //         };
  //       });

  //       console.log("FORMATTED DATA:", formatted); // ✅ DEBUG 2

  //       setRecords(formatted);

  //       console.log("RECORDS SET:", formatted); // ✅ DEBUG 3
  //     } catch (err) {
  //       console.error("FETCH ERROR:", err);
  //     }
  //   };

  //   loadAttendance();
  // }, []);

  // const [excelLink, setExcelLink] = useState("");
  const [fileName, setFileName] = useState("");
  const [holidays, setHolidays] = useState<any[]>([]);

  console.log("RECORDS LENGTH:", records.length);
  const [month, setMonth] = useState(() => {
    return (
      // localStorage.getItem("attendanceMonth") ||
      localStorage.getItem("attendanceMonth") ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
      })()
    );
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const allEmployees = getEmployees();
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  const employees = useMemo(() => {
    if (!isRoot) return allEmployees.filter((e) => e.zone === userZone);
    if (zoneFilter !== "all")
      return allEmployees.filter((e) => e.zone === zoneFilter);
    return allEmployees;
  }, [allEmployees, zoneFilter]);

  const empIds = useMemo(
    () => new Set(employees.map((e) => e.employeeId)),
    [employees],
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    setFileName(file.name);
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (ev) => {
      try {
        const fileData = ev.target?.result;

        let data: any[] = [];

        // ✅ HANDLE CSV
        if (file.name.endsWith(".csv")) {
          const text = new TextDecoder().decode(fileData as ArrayBuffer);
          const rows = text
            .split(/\r?\n/) // handles Windows/Mac newlines
            .filter((r) => r.trim() !== "") // remove empty lines
            .map((r) => r.split(",").map((c) => c.trim()));
          data = rows;
        }

        // ✅ HANDLE EXCEL
        else {
          const wb = XLSX.read(fileData, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        }

        console.log("PARSED RAW DATA:", data);

        const newRecords = data
          .slice(1)
          .map((row: any[]) => {
            const employeeId = String(row[0] || "").trim();

            if (!employeeId) return null;

            const rawDate = String(row[3] || "").trim();

            console.log("ROW DATE VALUE:", row[3]);

            const loginTime = String(row[4] || "");
            const logoutTime = String(row[5] || "");
            const hours = parseFloat(row[6] || "0");
            const statusRaw = String(row[7] || "").toUpperCase();

            //const year = new Date().getFullYear();
            const year = "2026";

            // const date = new Date(`${rawDate}-${year}`) // SUPPORT "DD-MM" OR "MM-DD"
            //   .toISOString()
            //   .split("T")[0];

            // Convert "01-Mar" → "2026-03-01" manually (NO timezone)
            const parts = rawDate.split("-");

            if (parts.length !== 2) {
              console.error("BAD DATE FORMAT:", rawDate);
              return null;
            }

            // const day = parts[0].trim();
            const day = parts[0].replace(/\D/g, ""); // remove hidden chars
            const mon = parts[1].trim();

            const monthMap: any = {
              Jan: "01",
              Feb: "02",
              Mar: "03",
              Apr: "04",
              May: "05",
              Jun: "06",
              Jul: "07",
              Aug: "08",
              Sep: "09",
              Oct: "10",
              Nov: "11",
              Dec: "12",
            };

            if (!monthMap[mon]) {
              console.error("INVALID DATE FORMAT:", rawDate);
              return null;
            }

            const date = `${year}-${monthMap[mon]}-${day.padStart(2, "0")}`;

            console.log("RAW:", rawDate, "→ FINAL:", date);

            let status = "Absent";

            if (statusRaw === "WO") status = "WeekOff";
            else if (statusRaw === "H") status = "Holiday";
            // else if (statusRaw === "CL") status = "CL";
            // else if (statusRaw === "PL") status = "PL";
            // else if (statusRaw === "SL") status = "SL";
            else if (statusRaw === "P" || hours > 0) status = "Present";
            console.log("RAW:", rawDate, "PARSED:", date);

            return {
              employeeId,
              date,
              loginTime,
              logoutTime,
              workingHours: hours,
              status,
            };
          })
          .filter(Boolean);

        console.log("FINAL RECORDS:", newRecords);

        await fetch("http://localhost:5001/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newRecords),
        });

        // reload attendance after upload
        const res = await fetch("http://localhost:5001/attendance");
        const response = await res.json();

        const rows = response.data || [];

        const mapped = rows.map((r: any) => ({
          employeeId: String(r.employee_id).trim(),
          date: r.date, // already string
          loginTime: r.login_time || "",
          logoutTime: r.logout_time || "",
          workingHours: Number(r.working_hours || 0),
          status: r.status,
        }));

        setRecords(mapped);

        toast.success(`Uploaded ${newRecords.length} records`);
      } catch (err) {
        console.error("PARSE ERROR:", err);
        toast.error("Failed to parse Excel file");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // const handleLinkUpload = async () => {
  //   try {
  //     if (!excelLink) {
  //       toast.error("Please enter a valid link");
  //       return;
  //     }

  //     const res = await fetch(excelLink);
  //     if (!res.ok) {
  //       throw new Error("Invalid or inaccessible file link");
  //     }
  //     const blob = await res.arrayBuffer();

  //     const wb = XLSX.read(blob, { type: "array" });
  //     const ws = wb.Sheets[wb.SheetNames[0]];
  //     const data = XLSX.utils.sheet_to_json<any>(ws);

  //     const newRecords: AttendanceRecord[] = data.map((row: any) => {
  //       const loginTime = String(row.loginTime || row.LoginTime || "");
  //       const logoutTime = String(row.logoutTime || row.LogoutTime || "");

  //       let workingHours = 0;
  //       if (loginTime && logoutTime) {
  //         const [lh, lm] = loginTime.split(":").map(Number);
  //         const [oh, om] = logoutTime.split(":").map(Number);
  //         workingHours = parseFloat(
  //           ((oh * 60 + om - lh * 60 - lm) / 60).toFixed(1),
  //         );
  //       }

  //   const date = String(row.date || row.Date || "");
  //   const dayOfWeek = new Date(date).getDay();

  //   let status: AttendanceRecord["status"] = "Absent";
  //   if (dayOfWeek === 0) status = "WeekOff";
  //   else if (workingHours > 0) status = "Present";

  //   return {
  //     employeeId: String(row.employeeId || row.EmployeeId || ""),
  //     date,
  //     loginTime,
  //     logoutTime,
  //     workingHours,
  //     status,
  //   };
  // });

  // const existing = records.filter(
  //   (r) =>
  //     !newRecords.some(
  //           (n) => n.employeeId === r.employeeId && n.date === r.date,
  //         ),
  //     );

  //     const merged = [...existing, ...newRecords];

  //     setRecords(merged);
  //     setAttendance(merged);
  //     setExcelLink("");

  //     toast.success(`Uploaded ${newRecords.length} records from link`);
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Failed to fetch Excel from link");
  //   }
  // };

  console.log("MONTH:", month);
  console.log(
    "RECORD DATES:",
    records.map((r) => r.date),
  );
  console.log("EMP IDS:", Array.from(empIds));
  console.log(
    "RECORD EMP IDS:",
    records.map((r) => r.employeeId),
  );

  console.log("MONTH:", month);
  console.log(
    "RECORD DATES:",
    records.map((r) => r.date),
  );

  console.log("EMP IDS:", Array.from(empIds));
  console.log(
    "RECORD EMP IDS:",
    records.map((r) => r.employeeId),
  );

  console.log("RECORDS BEFORE FILTER:", records);

  const filtered = records.filter((r) => {
    if (!r.date) return false;

    const [y, m, d] = r.date.split("-").map(Number);
    const recordVal = y * 10000 + m * 100 + d;

    const [year, monthNum] = month.split("-").map(Number);

    // ✅ NEW LOGIC: selected month = START of cycle
    const startVal = year * 10000 + monthNum * 100 + 23;

    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? year + 1 : year;

    const endVal = nextYear * 10000 + nextMonth * 100 + 22;

    return recordVal >= startVal && recordVal <= endVal;
  });

  const leaveSummary = filtered.reduce((acc: any, r: any) => {
    if (!acc[r.employeeId]) {
      acc[r.employeeId] = {
        employeeId: r.employeeId,
        name: r.name,
        department: r.department,
        Present: 0,
        Absent: 0,
        WeekOff: 0,
        CL: 0,
        PL: 0,
        SL: 0,
      };
    }

    if (acc[r.employeeId][r.status] !== undefined) {
      acc[r.employeeId][r.status]++;
    }

    return acc;
  }, {});

  const summaryArray = Object.values(leaveSummary);

  console.log("FIRST RECORD:", records[0]);
  console.log("MONTH:", month);
  console.log("FIRST RECORD MONTH:", records[0]?.date?.slice(0, 7));

  console.log("FILTERED RECORDS:", filtered);

  const downloadSample = () => {
    const sample = [
      {
        employeeId: "EMP001",
        date: "2026-03-01",
        loginTime: "09:00",
        logoutTime: "18:00",
      },
      {
        employeeId: "EMP002",
        date: "2026-03-01",
        loginTime: "09:15",
        logoutTime: "17:45",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance_sample.xlsx");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attendance Upload
          </h1>
          {!isRoot && userZone && (
            <p className="text-sm text-muted-foreground">{userZone}</p>
          )}
          {isRoot && <p className="text-sm text-muted-foreground">View only</p>}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {isRoot && (
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {ZONES.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isRoot && (
            <>
              <Button variant="outline" onClick={downloadSample}>
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                Sample Template
              </Button>
              {/* <Input
                placeholder="Paste Excel file link..."
                value={excelLink}
                onChange={(e) => setExcelLink(e.target.value)}
                Upload Excelƒ
                className="w-64"
              /> */}

              {/* <Button onClick={handleLinkUpload}>Upload via Link</Button> */}
              <Button onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" />
              </Button>
              {fileName && (
                <p className="text-xs text-muted-foreground">
                  Uploaded: {fileName}
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleUpload}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            localStorage.setItem("attendanceMonth", e.target.value);
          }}
          className="border rounded px-2 py-1 text-sm bg-card"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="excel-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Date</th>
              <th>Login</th>
              <th>Logout</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No attendance records for this month
                </td>
              </tr>
            ) : (
              filtered.slice(0, 200).map((r, i) => {
                const emp = allEmployees.find(
                  (e) =>
                    String(e.employeeId || "")
                      .trim()
                      .toUpperCase() ===
                    String(r.employeeId || "")
                      .trim()
                      .toUpperCase(),
                );

                const presentCount = filtered.filter(
                  (r) => r.status === "Present",
                ).length;
                const absentCount = filtered.filter(
                  (r) => r.status === "Absent",
                ).length;
                const weekOffCount = filtered.filter(
                  (r) => r.status === "WeekOff",
                ).length;

                const totalHours = filtered.reduce(
                  (sum, r) => sum + (Number(r.workingHours) || 0),
                  0,
                );

                return (
                  <tr key={i}>
                    <td className="font-mono text-sm">{r.employeeId}</td>

                    {/* ✅ use direct data */}
                    <td>{r.name || "—"}</td>
                    <td className="text-xs">{r.department || "—"}</td>

                    <td>{r.date}</td>
                    <td>{r.loginTime || "—"}</td>
                    <td>{r.logoutTime || "—"}</td>
                    <td>{r.workingHours || "—"}</td>

                    <td>
                      <span
                        className={
                          r.status === "Present"
                            ? "text-success font-medium"
                            : r.status === "Absent"
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
