import { useState, useEffect } from "react";
import {
  getEmployees,
  Employee,
  setEmployees,
  getAuthRole,
  getAuthZone,
  ZONES,
  Zone,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const role = getAuthRole();
const userZone = getAuthZone();
const isRoot = role === "root";
const isReadOnly = isRoot; // Root can only view, not modify

const defaultZone: Zone = userZone || "North Zone";
const emptyEmp: Employee = {
  employeeId: "",
  name: "",
  location: "",
  department: "",
  joiningDate: "",
  status: "active",
  zone: defaultZone,
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Employee>(emptyEmp);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  //const persist = (data: Employee[]) => { setLocal(data); };

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyEmp,
      zone: isRoot ? defaultZone : userZone || defaultZone,
    });
    setOpen(true);
  };
  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ ...emp });
    setOpen(true);
  };

  useEffect(() => {
    fetch("http://localhost:5001/employees")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((emp: any) => ({
          employeeId: emp.employee_id,
          name: emp.name,
          location: emp.location,
          department: emp.department,
          joiningDate: emp.joining_date,
          exitDate: emp.date_of_exit,
          status: emp.status,
          zone: emp.zone,
        }));
        setEmployees(formatted);
      });
  }, []);

  const handleSave = async () => {
    if (!form.employeeId || !form.name) {
      toast.error("Employee ID and Name are required");
      return;
    }

    if (form.status === "inactive" && !form.exitDate) {
      toast.error("Exit date is required for inactive employees");
      return;
    }

    try {
      if (editing) {
        await fetch(`http://localhost:5001/employees/${form.employeeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            location: form.location,
            department: form.department,
            joiningDate: form.joiningDate,
            status: form.status,
            zone: form.zone,
            exitDate: form.status === "inactive" ? form.exitDate : null,
          }),
        });

        toast.success("Employee updated successfully ✅");

        // 🔥 refresh from DB
        const res = await fetch("http://localhost:5001/employees");
        const data = await res.json();

        const formatted = data.map((emp: any) => ({
          employeeId: emp.employee_id,
          name: emp.name,
          location: emp.location,
          department: emp.department,
          joiningDate: emp.joining_date,
          exitDate: emp.date_of_exit,
          status: emp.status,
          zone: emp.zone,
        }));

        setEmployees(formatted);
      } else {
        // 🔥 SEND TO BACKEND
        await fetch("http://localhost:5001/employees", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: form.employeeId,
            name: form.name,
            location: form.location,
            department: form.department,
            joiningDate: form.joiningDate,
            status: form.status,
            zone: form.zone,
            exitDate: form.status === "inactive" ? form.exitDate : null, // ✅ ADD THIS
          }),
        });

        toast.success("Employee added to database ✅");

        // 🔥 FETCH UPDATED DATA FROM DB
        const res = await fetch("http://localhost:5001/employees");
        const data = await res.json();

        const formatted = data.map((emp: any) => ({
          employeeId: emp.employee_id,
          name: emp.name,
          location: emp.location,
          department: emp.department,
          joiningDate: emp.joining_date,
          exitDate: emp.date_of_exit,
          status: emp.status,
          zone: emp.zone,
        }));

        setEmployees(formatted);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving employee");
    }
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this employee?")) {
      await fetch(`http://localhost:5001/employees/${id}`, {
        method: "DELETE",
      });

      setEmployees((prev) => prev.filter((e) => e.employeeId !== id));

      toast.success("Employee deleted");
    }
  };

  const toggleStatus = async (empId: string) => {
    const emp = employees.find((e) => e.employeeId === empId);
    if (!emp) return;

    const newStatus = emp.status === "active" ? "inactive" : "active";

    await fetch(`http://localhost:5001/employees/${empId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: emp.name,
        location: emp.location,
        department: emp.department,
        joiningDate: emp.joiningDate,
        status: newStatus,
        zone: emp.zone,
        exitDate:
          newStatus === "inactive"
            ? new Date().toISOString().split("T")[0]
            : null,
      }),
    });

    // 🔥 REFRESH FROM DB
    const res = await fetch("http://localhost:5001/employees");
    const data = await res.json();

    const formatted = data.map((emp: any) => ({
      employeeId: emp.employee_id,
      name: emp.name,
      location: emp.location,
      department: emp.department,
      joiningDate: emp.joining_date,
      exitDate: emp.date_of_exit,
      status: emp.status,
      zone: emp.zone,
    }));

    setEmployees(formatted);

    toast.success("Status updated ✅");
  };

  // Zone-based filtering: root sees all (with optional zone filter), admin sees only their zone
  let zoneFiltered = employees;
  if (!isRoot) {
    zoneFiltered = employees.filter((e) => e.zone === userZone);
  } else if (zoneFilter !== "all") {
    zoneFiltered = employees.filter((e) => e.zone === zoneFilter);
  }

  const filtered = zoneFiltered.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase()),
  );

  const activeEmps = filtered.filter((e) => e.status === "active");
  const inactiveEmps = filtered.filter((e) => e.status === "inactive");

  const renderTable = (emps: Employee[], showExitDate: boolean) => (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="excel-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Location</th>
            <th>Department</th>
            {/* <th>Zone</th> */}
            <th>Joining Date</th>
            {showExitDate && <th>Exit Date</th>}
            <th>Status</th>
            {!isReadOnly && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {emps.length === 0 ? (
            <tr>
              <td
                colSpan={
                  showExitDate ? (isReadOnly ? 7 : 8) : isReadOnly ? 6 : 7
                }
                className="text-center text-muted-foreground py-8"
              >
                No employees found
              </td>
            </tr>
          ) : (
            emps.map((emp) => (
              <tr key={emp.employeeId}>
                <td>{emp.employeeId}</td>
                <td>{emp.name}</td>
                <td>{emp.location}</td>
                <td>{emp.department}</td>
                {/* <td>{emp.zone}</td> */}

                <td>
                  {emp.joiningDate
                    ? new Date(emp.joiningDate).toLocaleDateString("en-CA")
                    : ""}
                </td>

                {showExitDate && (
                  <td>
                    {emp.exitDate
                      ? new Date(emp.exitDate).toLocaleDateString("en-CA")
                      : "—"}
                  </td>
                )}

                <td>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      !isReadOnly ? "cursor-pointer" : ""
                    } ${
                      emp.status === "active"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                    onClick={() => !isReadOnly && toggleStatus(emp.employeeId)}
                  >
                    {emp.status}
                  </span>
                </td>

                {!isReadOnly && (
                  <td className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(emp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(emp.employeeId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Employee Management
          </h1>
          {!isRoot && userZone && (
            <p className="text-sm text-muted-foreground">{userZone}</p>
          )}
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
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          {!isReadOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Edit Employee" : "Add Employee"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Employee ID</Label>
                    <Input
                      value={form.employeeId}
                      onChange={(e) =>
                        setForm({ ...form, employeeId: e.target.value })
                      }
                      disabled={!!editing}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Input
                      value={form.department}
                      onChange={(e) =>
                        setForm({ ...form, department: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Zone</Label>
                    <Select
                      value={form.zone}
                      onValueChange={(v) =>
                        setForm({ ...form, zone: v as Zone })
                      }
                      disabled={!isRoot}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONES.map((z) => (
                          <SelectItem key={z} value={z}>
                            {z}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Joining Date</Label>
                    <Input
                      type="date"
                      value={form.joiningDate}
                      onChange={(e) =>
                        setForm({ ...form, joiningDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm({ ...form, status: v as Employee["status"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.status === "inactive" && (
                    <div className="space-y-1">
                      <Label>Exit / Resigning Date</Label>
                      <Input
                        type="date"
                        value={form.exitDate || ""}
                        onChange={(e) =>
                          setForm({ ...form, exitDate: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
                <Button onClick={handleSave} className="mt-2 w-full">
                  {editing ? "Update" : "Add"} Employee
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active Employees ({activeEmps.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive Employees ({inactiveEmps.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          {renderTable(activeEmps, false)}
        </TabsContent>
        <TabsContent value="inactive" className="mt-4">
          {renderTable(inactiveEmps, true)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
