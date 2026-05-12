import { useState, useMemo } from "react";
import {
  getBonuses,
  setBonuses,
  getLeaves,
  BonusRecord,
  isLeapYear,
  getAuthRole,
  getAuthZone,
  ZONES,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

const role = getAuthRole();
const userZone = getAuthZone();
const isRoot = role === "root";
//const [search, setSearch] = useState("");

export default function BonusManagement() {
  //const allEmployees = getEmployees();
  const [employeesData, setEmployees] = useState<any[]>([]);
  const leaves = getLeaves();
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(""); //
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<any>({
    employeeId: "",
    year: new Date().getFullYear(), // ✅ ADD
    amount: 0,
    reason: "",
  });
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const totalDaysInYear = isLeapYear(year) ? 366 : 365;

  useEffect(() => {
    fetch("http://localhost:5001/employees")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((emp: any) => ({
          employeeId: emp.employee_id,
          name: emp.name,
          department: emp.department,
          zone: emp.zone,
          status: emp.status,
        }));
        setEmployees(formatted);
      });
  }, []);
  useEffect(() => {
    fetch("http://localhost:5001/bonus")
      .then((res) => res.json())
      .then((data) => {
        console.log("BONUS DATA:", data); // debug
        setBonuses(data);
      });
  }, []);
  

  const employees = useMemo(() => {
    if (!isRoot) return employeesData.filter((e) => e.zone === userZone);
    if (zoneFilter !== "all")
      return employeesData.filter((e) => e.zone === zoneFilter);
    return employeesData;
  }, [employeesData, zoneFilter]);

  const activeEmployees = employees.filter((e) => e.status === "active");

  const empIds = useMemo(
    () => new Set(employees.map((e) => e.employeeId)),
    [employees],
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      employeeId: employees[0]?.employeeId || "",
      year: "",
      amount: 0,
      reason: "",
    });
    setOpen(true);
  };
  const openEdit = (idx: number) => {
    setEditing(idx);
    setForm({ ...bonuses[idx] });
    setOpen(true);
  };

  // const handleSave = async () => {
  //   if (!form.employeeId || !form.year) {
  //     toast.error("All fields required");

  //     return;
  //   }

  //   await fetch("http://localhost:5001/bonus", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       employeeId: form.employeeId,
  //       year: form.year,
  //       amount: form.amount,
  //       reason: form.reason,
  //     }),
  //   });

  //   useEffect(() => {
  //     fetch("http://localhost:5001/bonus")
  //       .then((res) => res.json())
  //       .then((data) => setBonuses(data));
  //   }, []);

  //   toast.success("Bonus saved to database ✅");

  //   // OPTIONAL: refresh bonus list from backend later
  //   setOpen(false);
  //   const res = await fetch("http://localhost:5001/bonus");
  //   const data = await res.json();
  //   setBonuses(data);
  // };

  const handleSave = async () => {
    try {
      console.log("Saving bonus:", form); // 👈 DEBUG

      if (!form.employeeId || !form.year) {
        toast.error("All fields required");
        return;
      }

      const res = await fetch("http://localhost:5001/bonus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: form.employeeId,
          year: form.year,
          amount: form.amount,
          reason: form.reason,
        }),
      });

      console.log("Response:", res); // 👈 DEBUG

      if (!res.ok) {
        throw new Error("Failed to save bonus");
      }

      toast.success("Bonus saved ✅");

      // 🔥 refresh list
      const updated = await fetch("http://localhost:5001/bonus");
      const data = await updated.json();
      setBonuses(data);

      setOpen(false);
    } catch (err) {
      console.error("ERROR:", err);
      toast.error("Failed to save bonus ❌");
    }
  };

  const handleDelete = async (idx: number) => {
    if (confirm("Delete this bonus entry?")) {
      // Assuming backend delete endpoint exists, e.g., DELETE /bonus with body or params
      // Adjust based on your API; here assuming delete by employeeId and year
      await fetch("http://localhost:5001/bonus", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: bonuses[idx].employee_id,
          year: bonuses[idx].year,
        }),
      });
      // Refresh bonuses from backend
      const res = await fetch("http://localhost:5001/bonus");
      const data = await res.json();
      setBonuses(data);
      toast.success("Deleted");
    }
  };

  const filteredBonuses = bonuses.filter((b) => empIds.has(b.employee_id));

  const workingDaysData = useMemo(() => {
    return employees.map((emp) => {
      const empLeaves = leaves.filter(
        (l) => l.employeeId === emp.employeeId && l.year === year,
      );
      const totalLeavesTaken = empLeaves.reduce(
        (sum, l) => sum + l.usedLeaves,
        0,
      );
      const workingDays = totalDaysInYear - totalLeavesTaken;
      return { ...emp, totalLeavesTaken, workingDays };
    });
  }, [employees, leaves, year, totalDaysInYear]);
  const filteredWorkingDays = workingDaysData.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bonus Management
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRoot ? "View only" : "Manage bonus entries for employees"}
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
          {!isRoot && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Bonus
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editing !== null ? "Edit Bonus" : "Add Bonus"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Employee</Label>
                    <Select
                      value={form.employeeId}
                      onValueChange={(v) => setForm({ ...form, employeeId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmployees.map((e) => (
                          <SelectItem key={e.employeeId} value={e.employeeId}>
                            {e.employeeId} — {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={form.year}
                      onChange={(e) =>
                        setForm({ ...form, year: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Reason</Label>
                    <Input
                      value={form.reason}
                      onChange={(e) =>
                        setForm({ ...form, reason: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full mt-2">
                  Save
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <h3 className="font-semibold text-foreground px-4 pt-3 pb-1">
          Bonus Entries
        </h3>
        <table className="excel-table">
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Year</th>
              <th>Amount (₹)</th>
              <th>Reason</th>
              {!isRoot && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredBonuses.length === 0 ? (
              <tr>
                <td
                  colSpan={isRoot ? 6 : 7}
                  className="text-center text-muted-foreground py-8"
                >
                  No bonus entries
                </td>
              </tr>
            ) : (
              filteredBonuses.map((b, i) => {
                const emp = employees.find(
                  (e) => e.employeeId === b.employee_id,
                );
                return (
                  <tr key={i}>
                    <td className="font-mono text-sm">{b.employee_id}</td>
                    <td>{emp?.name || b.employee_id}</td>
                    <td className="text-xs">{emp?.department || "—"}</td>
                    <td>{b.year}</td>
                    <td className="font-mono">₹{b.amount.toLocaleString()}</td>
                    <td>{b.reason}</td>
                    {!isRoot && (
                      <td className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(i)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(i)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h3 className="font-semibold text-foreground">
            Cumulative Working Days — {year} ({totalDaysInYear} days)
          </h3>

          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(
                (y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="px-4 pb-2">
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
        </div>
        <p className="text-xs text-muted-foreground px-4 pb-2">
          Working Days = {totalDaysInYear} − Total Leaves Taken
        </p>
        <table className="excel-table">
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Employee</th>
              <th>Zone</th>
              <th>Total Leaves Taken</th>
              <th>Cumulative Working Days</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkingDays.map((emp) => (
              <tr key={emp.employeeId}>
                <td className="font-mono text-sm">{emp.employeeId}</td>
                <td className="whitespace-nowrap">{emp.name}</td>
                <td className="text-xs">{emp.zone}</td>
                <td className="text-center">{emp.totalLeavesTaken}</td>
                <td className="text-center font-semibold">{emp.workingDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
