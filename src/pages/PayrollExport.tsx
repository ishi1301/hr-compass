import {
  getEmployees,
  getAttendance,
  getBonuses,
  getWorkingDays,
  MONTHS,
  getAuthRole,
  getAuthZone,
  ZONES,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useState, useMemo, useEffect } from "react";

const role = getAuthRole();
const userZone = getAuthZone();
const isRoot = role === "root";

export default function PayrollExport() {
  //const allEmployees = getEmployees();
  const [employees, setEmployees] = useState<any[]>([]); // ✅ FETCHED FROM BACKEND
  const [attendance, setAttendance] = useState<any[]>([]);
  // const attendance = getAttendance();
  //const bonuses = getBonuses();
  // const [bonuses, setBonuses] = useState<any[]>([]);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  useEffect(() => {
    fetch("http://localhost:5001/employees")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((emp: any) => ({
          employeeId: emp.employee_id,
          name: emp.name,
          department: emp.department, // ✅ ADD
          location: emp.location, // ✅ ADD
          zone: emp.zone,
          status: emp.status,
        }));
        setEmployees(formatted);
      });
  }, []);

  useEffect(() => {
    fetch("http://localhost:5001/attendance")
      .then((res) => res.json())
      .then((data) => {
        const rows = data.data || data;

        const mapped = rows.map((a: any) => ({
          employeeId: a.employee_id,
          date: a.date,
          status: a.status,
          workingHours: a.working_hours,
        }));

        setAttendance(mapped);
      })
      .catch((err) => console.error("ATT ERROR:", err));
  }, []);

  // useEffect(() => {
  //   fetch("http://localhost:5001/bonus")
  //     .then((res) => res.json())
  //     .then((data) => {
  //       console.log("BONUSES IN PAYROLL:", data); // 👈 ADD THIS
  //       setBonuses(data);
  //     });
  // }, []);

  const activeEmployees = employees.filter((e) => e.status === "active");

  const filteredEmployees = useMemo(() => {
    let data = employees;

    if (!isRoot) {
      data = data.filter((e) => e.zone === userZone);
    } else if (zoneFilter !== "all") {
      data = data.filter((e) => e.zone === zoneFilter);
    }

    return data.filter((e) => e.status === "active"); // ✅ ONLY ACTIVE
  }, [employees, zoneFilter]);

  const [y, m] = month.split("-").map(Number);
  const wd = getWorkingDays(y, m);

  const payrollData = filteredEmployees?.map((emp) => {
    // const monthAtt = attendance.filter((a) => {
    //   const d = new Date(a.date);
    //   return (
    //     a.employeeId === emp.employeeId &&
    //     d.getFullYear() === y &&
    //     d.getMonth() + 1 === m
    //   );
    // });

    const monthAtt = attendance.filter((a) => {
      if (!a.date) return false;

      const [yy, mm, dd] = a.date.split("-").map(Number);
      const recordVal = yy * 10000 + mm * 100 + dd;

      const startVal = y * 10000 + m * 100 + 23;

      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;

      const endVal = nextYear * 10000 + nextMonth * 100 + 22;

      return (
        a.employeeId === emp.employeeId &&
        recordVal >= startVal &&
        recordVal <= endVal
      );
    });

    const present = monthAtt.filter((a) => a.status === "Present").length;
    const absent = monthAtt.filter((a) => a.status === "Absent").length;
    const weekOff = monthAtt.filter((a) => a.status === "WeekOff").length;
    // const totalHours = monthAtt.reduce((s, a) => s + a.workingHours, 0);
    const totalHours = monthAtt.reduce(
      (s, a) => s + (parseFloat(a.workingHours) || 0),
      0,
    );

    // const bonus = bonuses
    //   .filter(
    //     (b) =>
    //       b.employee_id?.toLowerCase() === emp.employeeId?.toLowerCase() &&
    //       Number(b.year) === y,
    //   )
    //   .reduce((s, b) => s + Number(b.amount), 0);

    return {
      ...emp,
      present,
      absent,
      weekOff,
      totalHours: totalHours.toFixed(1),
      workingDays: wd.total,
    };
  });

  const exportToExcel = () => {
    const rows = payrollData.map((p) => ({
      "Employee ID": p.employeeId,
      Name: p.name,
      Department: p.department,
      Location: p.location,
      Zone: p.zone,
      Status: p.status,
      "Working Days": p.workingDays,
      "Days Present": p.present,
      "Days Absent": p.absent,
      "Week Off": p.weekOff,
      "Total Hours": p.totalHours,
      // "Bonus (₹)": p.bonus,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `Payroll_${month}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Payroll Export</h1>
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
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-card"
          />
          {!isRoot && (
            <Button onClick={exportToExcel}>
              <Download className="mr-1 h-4 w-4" />
              Export to Excel
            </Button>
          )}
        </div>
      </div>

      <div className="stat-card">
        <p className="text-sm text-muted-foreground mb-2">
          {MONTHS[m - 1]} {y} — {wd.total} working days ({wd.sundays} Sundays
          off, {wd.saturdaysOff} Saturdays off, {wd.workingSaturdays} working
          Saturdays)
          {wd.holidayCount > 0 && `, ${wd.holidayCount} gazetted holiday(s)`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="excel-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Dept</th>
              <th>Location</th>
              <th>Zone</th>
              <th>Status</th>
              <th>Working Days</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Week Off</th>
              <th>Hours</th>
              {/* <th>Bonus (₹)</th> */}
            </tr>
          </thead>
          <tbody>
            {payrollData.map((p) => (
              <tr key={p.employeeId}>
                <td className="font-mono text-sm">{p.employeeId}</td>
                <td>{p.name}</td>
                <td>{p.department}</td>
                <td>{p.location}</td>
                <td className="text-xs">{p.zone}</td>
                <td>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${p.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="text-center">{p.workingDays}</td>
                <td className="text-center text-success font-medium">
                  {p.present}
                </td>
                <td
                  className={`text-center ${p.absent > 0 ? "text-destructive font-medium" : ""}`}
                >
                  {p.absent}
                </td>
                <td className="text-center">{p.weekOff}</td>
                <td className="text-center">{p.totalHours}</td>
                {/* <td className="text-center font-mono">
                  {p.bonus > 0 ? `₹${p.bonus.toLocaleString()}` : "—"}
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
