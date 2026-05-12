import { useState, useEffect, useMemo } from "react";
import {
  getAttendance,
  getLeaves,
  setLeaves,
  getRemarks,
  setRemarks,
  LeaveRecord,
  EmployeeRemark,
  MONTHS,
  LEAVE_REASONS,
  getAuthRole,
  getAuthZone,
  ZONES,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";

const CL_PER_MONTH = 1;
const PL_PER_MONTH = 1.25;

const role = getAuthRole();
const userZone = getAuthZone();
const isRoot = role === "root";

export default function LeaveTracker() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  // const attendance = getAttendance();
  const [leaves, setLocalLeaves] = useState(getLeaves);
  const [remarks, setLocalRemarks] = useState(getRemarks);
  const [year] = useState(new Date().getFullYear());
  const [editCell, setEditCell] = useState<{
    empId: string;
    month: number;
  } | null>(null);
  const [editLeaves, setEditLeaves] = useState(0);
  const [editReason, setEditReason] = useState("");
  const [remarkEmp, setRemarkEmp] = useState<string | null>(null);
  const [newRemark, setNewRemark] = useState("");
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

        console.log("ATTENDANCE FROM API:", mapped); // debug
        setAttendance(mapped);
      });
  }, []);

  const activeEmployees = employees.filter((e) => e.status === "active");

  const filteredEmployees = useMemo(() => {
    if (!isRoot) return employees.filter((e) => e.zone === userZone);
    if (zoneFilter !== "all")
      return employees.filter((e) => e.zone === zoneFilter);
    return employees;
  }, [employees, zoneFilter]);

  const currentMonth = new Date().getMonth() + 1;
  const completedMonths = currentMonth - 1;

  const leaveData = useMemo(() => {
    const map: Record<
      string,
      Record<
        number,
        {
          leavesTaken: number;
          clUsed: number; // ✅ ADD
          plUsed: number; // ✅ ADD
          clBal: number;
          plBal: number;
          unpaid: number;
          reason: string;
        }
      >
    > = {};
    filteredEmployees.forEach((emp) => {
      map[emp.employeeId] = {};
      let clBal = 0,
        plBal = 0;
      for (let m = 1; m <= 12; m++) {
        clBal += CL_PER_MONTH;
        plBal += PL_PER_MONTH;
        const override = leaves.find(
          (l) =>
            l.employeeId === emp.employeeId && l.month === m && l.year === year,
        );

        const leavesTaken = override
          ? override.usedLeaves
          : attendance.filter((a) => {
              if (!a.date) return false;

              const [yy, mm, dd] = a.date.split("-").map(Number);
              const recordVal = yy * 10000 + mm * 100 + dd;

              const startVal = year * 10000 + m * 100 + 23;

              const nextMonth = m === 12 ? 1 : m + 1;
              const nextYear = m === 12 ? year + 1 : year;

              const endVal = nextYear * 10000 + nextMonth * 100 + 22;

              return (
                a.employeeId === emp.employeeId &&
                recordVal >= startVal &&
                recordVal <= endVal &&
                a.status === "Absent"
              );
            }).length;

        let remaining = leavesTaken;
        const clUsed = Math.min(remaining, clBal);
        clBal -= clUsed;
        remaining -= clUsed;
        const plUsed = Math.min(remaining, plBal);
        plBal -= plUsed;
        const unpaid = remaining - plUsed;

        map[emp.employeeId][m] = {
          leavesTaken,
          clUsed, // ✅ ADD
          plUsed, // ✅ ADD
          clBal: parseFloat(clBal.toFixed(2)),
          plBal: parseFloat(plBal.toFixed(2)),
          unpaid,
          reason: override?.reason || "",
        };
      }
    });
    return map;
  }, [filteredEmployees, attendance, leaves, year]);

  const openEdit = (empId: string, month: number) => {
    if (isRoot) return; // Root can't edit
    const d = leaveData[empId]?.[month];
    setEditLeaves(d?.leavesTaken || 0);
    setEditReason(d?.reason || "");
    setEditCell({ empId, month });
  };

  const saveEdit = () => {
    if (!editCell) return;
    const existing = leaves.filter(
      (l) =>
        !(
          l.employeeId === editCell.empId &&
          l.month === editCell.month &&
          l.year === year
        ),
    );
    const updated: LeaveRecord[] = [
      ...existing,
      {
        employeeId: editCell.empId,
        month: editCell.month,
        year,
        cl: 0,
        pl: 0,
        usedLeaves: editLeaves,
        unpaidLeaves: 0,
        reason: editReason,
      },
    ];
    setLocalLeaves(updated);
    setLeaves(updated);
    setEditCell(null);
    toast.success("Leaves updated — balances recalculated");
  };

  const getEmpRemarks = (empId: string) =>
    remarks.filter((r) => r.employeeId === empId);

  const addRemark = () => {
    if (isRoot || !remarkEmp || !newRemark.trim()) return;
    const updated: EmployeeRemark[] = [
      ...remarks,
      {
        employeeId: remarkEmp,
        text: newRemark.trim(),
        date: new Date().toISOString().split("T")[0],
      },
    ];
    setLocalRemarks(updated);
    setRemarks(updated);
    setNewRemark("");
    toast.success("Remark added");
  };

  const getEmployeeSummary = (empId: string) => {
    const emp = filteredEmployees.find((e) => e.employeeId === empId);
    let totalLeaves = 0,
      totalUnpaid = 0,
      irregularities = 0;
    for (let m = 1; m <= completedMonths; m++) {
      const d = leaveData[empId]?.[m];
      if (d) {
        totalLeaves += d.leavesTaken;
        totalUnpaid += d.unpaid;
      }
    }
    const empAtt = attendance.filter(
      (a) => a.employeeId === empId && a.status === "Present",
    );
    irregularities = empAtt.filter((a) => a.workingHours < 6).length;
    return {
      name: emp?.name || empId,
      empId,
      totalLeaves,
      totalUnpaid,
      irregularities,
    };
  };

  const filtered = filteredEmployees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Leave Tracker — {year}
          </h1>
          <p className="text-sm text-muted-foreground">
            CL: 12/year (1/mo) | PL: 15/year (1.25/mo).{" "}
            {isRoot
              ? "View only."
              : "Click any month cell to update leaves taken."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="excel-table">
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Employee</th>
              <th>Zone</th>
              {MONTHS.slice(0, completedMonths).map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th>CL Used</th>
              <th>PL Used</th>
              <th>Total Taken</th>
              <th>CL Bal</th>
              <th>PL Bal</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => {
              const data = leaveData[emp.employeeId] || {};
              let totalTaken = 0;
              for (let m = 1; m <= completedMonths; m++)
                totalTaken += data[m]?.leavesTaken || 0;
              const lastCompMonth = completedMonths > 0 ? completedMonths : 1;
              const finalCL = data[lastCompMonth]?.clBal || 0;
              const finalPL = data[lastCompMonth]?.plBal || 0;
              const totalCLUsed = Object.values(data).reduce(
                (sum: any, d: any) => sum + (d?.clUsed || 0),
                0,
              );

              const totalPLUsed = Object.values(data).reduce(
                (sum: any, d: any) => sum + (d?.plUsed || 0),
                0,
              );

              return (
                <tr key={emp.employeeId}>
                  <td className="font-mono text-sm">{emp.employeeId}</td>
                  <td className="font-medium whitespace-nowrap">{emp.name}</td>
                  <td className="text-xs">{emp.zone}</td>

                  {Array.from({ length: completedMonths }, (_, i) => i + 1).map(
                    (m) => {
                      const d = data[m];
                      const lt = d?.leavesTaken || 0;
                      const cellClass =
                        lt === 0
                          ? "cell-green"
                          : (d?.unpaid || 0) > 0
                            ? "cell-red"
                            : "";
                      return (
                        <td
                          key={m}
                          className={`${!isRoot ? "cursor-pointer" : ""} text-center ${cellClass}`}
                          onClick={() => openEdit(emp.employeeId, m)}
                          title={d?.reason || ""}
                        >
                          {lt}
                        </td>
                      );
                      const totalCLUsed = Object.values(data).reduce(
                        (sum: any, d: any) => sum + (d?.clUsed || 0),
                        0,
                      );

                      const totalPLUsed = Object.values(data).reduce(
                        (sum: any, d: any) => sum + (d?.plUsed || 0),
                        0,
                      );
                    },
                  )}

                  <td className="text-center font-semibold">
                    {data[lastCompMonth]?.clUsed || 0}
                  </td>
                  <td className="text-center font-semibold">
                    {data[lastCompMonth]?.plUsed || 0}
                  </td>
                  <td className="text-center font-semibold">{totalTaken}</td>

                  <td
                    className={`text-center ${finalCL <= 0 ? "cell-red" : ""}`}
                  >
                    {finalCL.toFixed(2)}
                  </td>
                  <td
                    className={`text-center ${finalPL <= 0 ? "cell-red" : ""}`}
                  >
                    {finalPL.toFixed(2)}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemarkEmp(emp.employeeId)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isRoot && (
        <Dialog open={!!editCell} onOpenChange={() => setEditCell(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Update Leaves — {editCell && MONTHS[editCell.month - 1]} {year}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Leaves Taken</Label>
                <Input
                  type="number"
                  min={0}
                  value={editLeaves}
                  onChange={(e) => setEditLeaves(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>Reason for Leave</Label>
                <Select value={editReason} onValueChange={setEditReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveEdit} className="w-full mt-2">
              Save — Balance will auto-update
            </Button>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!remarkEmp} onOpenChange={() => setRemarkEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Remarks</DialogTitle>
          </DialogHeader>
          {remarkEmp &&
            (() => {
              const r = getEmployeeSummary(remarkEmp);
              const empRemarks = getEmpRemarks(remarkEmp);
              return (
                <div className="space-y-4">
                  <p className="font-semibold text-foreground">
                    {r.empId} — {r.name}
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">
                        Total Leaves Taken
                      </span>
                      <span className="font-medium">{r.totalLeaves}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">
                        Unpaid Leaves
                      </span>
                      <span
                        className={`font-medium ${r.totalUnpaid > 0 ? "text-destructive" : ""}`}
                      >
                        {r.totalUnpaid}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">
                        Attendance Irregularities (&lt;6hrs)
                      </span>
                      <span
                        className={`font-medium ${r.irregularities > 0 ? "text-warning" : ""}`}
                      >
                        {r.irregularities}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Remarks History
                    </h4>
                    {empRemarks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No remarks yet.
                      </p>
                    ) : (
                      empRemarks.map((rm, i) => (
                        <div
                          key={i}
                          className="text-sm border rounded p-2 bg-muted/50"
                        >
                          <span className="text-muted-foreground text-xs">
                            {rm.date}
                          </span>
                          <p className="text-foreground">{rm.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {!isRoot && (
                    <div className="space-y-2">
                      <Label>Add Remark</Label>
                      <Textarea
                        value={newRemark}
                        onChange={(e) => setNewRemark(e.target.value)}
                        placeholder="Write a remark..."
                        rows={2}
                      />
                      <Button onClick={addRemark} size="sm" className="w-full">
                        Add Remark
                      </Button>
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
