import { useState, useMemo, useEffect } from "react";
import {
  getEmployees,
  getAttendance,
  getWorkingDays,
  getWorkingDaysCycle,
  getHolidays,
  setHolidays,
  GazettedHoliday,
  MONTHS,
  FULL_MONTHS,
  LEAVE_REASONS,
  getAuthRole,
  getAuthZone,
  ZONES,
} from "@/lib/store";
import { Users, CalendarDays, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// const [attendance, setAttendance] = useState<any[]>([]);
const role = getAuthRole();
const userZone = getAuthZone();
const isRoot = role === "root";

export default function Dashboard() {
  // const allEmployees = getEmployees();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // const allAttendance = getAttendance();

  const nowDate = new Date();
  // const [selectedYear, setSelectedYear] = useState(nowDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return (
      Number(localStorage.getItem("selectedMonth")) || new Date().getMonth() + 1
    );
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return (
      Number(localStorage.getItem("selectedYear")) || new Date().getFullYear()
    );
  });

  const [holidays, setLocalHolidays] = useState<any[]>([]);
  
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");
  

  const [empDetailId, setEmpDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  useEffect(() => {
    fetch("http://localhost:5001/employees")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((emp: any) => ({
          employeeId: emp.employee_id,
          name: emp.name,
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

        console.log("DASHBOARD ATTENDANCE:", mapped); // debug
        setAttendance(mapped);
      });
  }, []);

  useEffect(() => {
    const data = getHolidays();
    console.log("HOLIDAYS LOADED:", data); // debug
    setLocalHolidays(data);
  }, []);

  useEffect(() => {
  localStorage.setItem("selectedMonth", String(selectedMonth));
}, [selectedMonth]);

useEffect(() => {
  localStorage.setItem("selectedYear", String(selectedYear));
}, [selectedYear]);

  // Zone filtering
  const filteredEmployees = useMemo(() => {
    let data = employees;

    if (!isRoot) {
      data = data.filter((e) => e.zone === userZone);
    } else if (zoneFilter !== "all") {
      data = data.filter((e) => e.zone === zoneFilter);
    }

    // ✅ ONLY ACTIVE EMPLOYEES
    return data.filter((e) => e.status === "active");
  }, [employees, zoneFilter]);

  const filteredAttendance = useMemo(() => {
    const empIds = new Set(filteredEmployees?.map((e) => e.employeeId));
    return attendance.filter((a) => empIds.has(a.employeeId));
  }, [attendance, filteredEmployees]);

  const wd = getWorkingDaysCycle(selectedYear, selectedMonth, holidays);

  // const monthHolidays = holidays.filter((h) => {
  //   if (!h.date) return false;

  //   const [yy, mm] = h.date.split("-").map(Number);

  //   return yy === selectedYear && mm === selectedMonth;
  // });

  const monthHolidays = holidays.filter((h) => {
    if (!h.date) return false;

    const [yy, mm, dd] = h.date.split("-").map(Number);
    const recordVal = yy * 10000 + mm * 100 + dd;

    const startVal = selectedYear * 10000 + selectedMonth * 100 + 23;

    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;

    const endVal = nextYear * 10000 + nextMonth * 100 + 22;

    return recordVal >= startVal && recordVal <= endVal;
  });

  const addHoliday = () => {
    if (!hDate || !hName) {
      toast.error("Date and name required");
      return;
    }
    const updated = [...holidays, { date: hDate, name: hName }];
    setLocalHolidays(updated);
    setHolidays(updated);
    setHDate("");
    setHName("");
    setAddHolidayOpen(false);
    toast.success("Holiday added");
  };

  const removeHoliday = (date: string) => {
    const updated = holidays.filter((h) => h.date !== date);
    setLocalHolidays(updated);
    setHolidays(updated);
    toast.success("Holiday removed");
  };

  const empSummary = useMemo(() => {
    return filteredEmployees.map((emp) => {
      // const monthAtt = filteredAttendance.filter((a) => {
      //   const d = new Date(a.date);
      //   return (
      //     a.employeeId === emp.employeeId &&
      //     d.getFullYear() === selectedYear &&
      //     d.getMonth() + 1 === selectedMonth
      //   );
      // });
      const monthAtt = filteredAttendance.filter((a) => {
        if (!a.date) return false;

        const [yy, mm, dd] = a.date.split("-").map(Number);
        const recordVal = yy * 10000 + mm * 100 + dd;

        const startVal = selectedYear * 10000 + selectedMonth * 100 + 23;

        const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;

        const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;

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
      const absentDates = monthAtt
        .filter((a) => a.status === "Absent")
        .map((a) => a.date);
      const weekOffDates = monthAtt
        .filter((a) => a.status === "WeekOff")
        .map((a) => a.date);
      return { ...emp, present, absent, weekOff, absentDates, weekOffDates };
    });
  }, [filteredEmployees, attendance, selectedYear, selectedMonth]);

  const totalEmployees = filteredEmployees.length;

  const filteredSummary = empSummary.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase()),
  );

  const years = Array.from(
    { length: 5 },
    (_, i) => nowDate.getFullYear() - 2 + i,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        {!isRoot && userZone && (
          <p className="text-sm text-muted-foreground">{userZone}</p>
        )}
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
      </div>

      <div className="stat-card flex items-center gap-4">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-3xl font-bold text-foreground">{totalEmployees}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={String(selectedMonth)}
          onValueChange={(v) => setSelectedMonth(Number(v))}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FULL_MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-3">
            {FULL_MONTHS[selectedMonth - 1]} {selectedYear} — Calendar Breakdown
          </h3>
          <table className="excel-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Calendar Days</td>
                <td>{wd.calendarDays}</td>
              </tr>
              <tr>
                <td>Total Sundays</td>
                <td>{wd.sundays}</td>
              </tr>
              <tr>
                <td>Total Saturdays</td>
                <td>{wd.totalSaturdays}</td>
              </tr>
              <tr>
                <td>Saturdays Off</td>
                <td>{wd.saturdaysOff}</td>
              </tr>
              <tr>
                <td>Working Saturdays</td>
                <td>{wd.workingSaturdays}</td>
              </tr>
              <tr>
                <td>Gazetted Holidays</td>
                <td>{wd.holidayCount}</td>
              </tr>
              <tr>
                <td className="font-semibold">Total Working Days</td>
                <td className="font-semibold">{wd.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">
              Gazetted Holidays — {FULL_MONTHS[selectedMonth - 1]}
            </h3>
            {!isRoot && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddHolidayOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
          {monthHolidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No gazetted holidays this month.
            </p>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday</th>
                  {!isRoot && <th></th>}
                </tr>
              </thead>
              <tbody>
                {monthHolidays.map((h) => (
                  <tr key={h.date}>
                    <td>{h.date}</td>
                    <td>{h.name}</td>
                    {!isRoot && (
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHoliday(h.date)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-foreground">
            Employee Summary — {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Zone</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Week Off</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummary.map((emp) => (
                <tr key={emp.employeeId}>
                  <td className="font-mono text-sm">{emp.employeeId}</td>
                  <td>{emp.name}</td>
                  <td className="text-xs">{emp.zone}</td>
                  <td className="text-center text-success font-medium">
                    {emp.present}
                  </td>
                  <td
                    className={`text-center ${emp.absent > 0 ? "text-destructive font-medium" : ""}`}
                  >
                    {emp.absent}
                  </td>
                  <td className="text-center">{emp.weekOff}</td>
                  <td className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEmpDetailId(emp.employeeId)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!isRoot && (
        <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gazetted Holiday</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={hDate}
                  onChange={(e) => setHDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Holiday Name</Label>
                <Input
                  value={hName}
                  onChange={(e) => setHName(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={addHoliday} className="w-full mt-2">
              Add Holiday
            </Button>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!empDetailId} onOpenChange={() => setEmpDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Employee Detail — {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
            </DialogTitle>
          </DialogHeader>
          {empDetailId &&
            (() => {
              const emp = empSummary.find((e) => e.employeeId === empDetailId);
              if (!emp) return null;
              return (
                <div className="space-y-4">
                  <p className="font-semibold text-foreground">
                    {emp.employeeId} — {emp.name}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="border rounded p-2">
                      <p className="text-xs text-muted-foreground">Present</p>
                      <p className="text-xl font-bold text-success">
                        {emp.present}
                      </p>
                    </div>
                    <div className="border rounded p-2">
                      <p className="text-xs text-muted-foreground">Absent</p>
                      <p className="text-xl font-bold text-destructive">
                        {emp.absent}
                      </p>
                    </div>
                    <div className="border rounded p-2">
                      <p className="text-xs text-muted-foreground">Week Off</p>
                      <p className="text-xl font-bold text-foreground">
                        {emp.weekOff}
                      </p>
                    </div>
                  </div>
                  {emp.absentDates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        Absent Dates
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {emp.absentDates.map((d) => (
                          <span
                            key={d}
                            className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {emp.weekOffDates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        Week Off Dates
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {emp.weekOffDates.map((d) => (
                          <span
                            key={d}
                            className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
