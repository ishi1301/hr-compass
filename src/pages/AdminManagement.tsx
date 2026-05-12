import { useState } from "react";
import { getAdmins, setAdmins, AdminUser, ZONES, Zone } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const emptyAdmin: AdminUser = { id: "", username: "", password: "", name: "", zone: "North Zone", email: "", active: true };

export default function AdminManagement() {
  const [admins, setLocal] = useState(getAdmins);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<AdminUser>(emptyAdmin);

  const persist = (data: AdminUser[]) => { setLocal(data); setAdmins(data); };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyAdmin, id: `admin_${Date.now()}` });
    setOpen(true);
  };

  const openEdit = (admin: AdminUser) => {
    setEditing(admin);
    setForm({ ...admin });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.username || !form.password || !form.name || !form.zone) {
      toast.error("All fields are required");
      return;
    }
    if (editing) {
      persist(admins.map(a => a.id === editing.id ? form : a));
      toast.success("Admin updated");
    } else {
      if (admins.find(a => a.username === form.username)) {
        toast.error("Username already exists");
        return;
      }
      // Ensure one admin per zone
      if (admins.find(a => a.zone === form.zone)) {
        toast.error(`An admin already exists for ${form.zone}`);
        return;
      }
      persist([...admins, form]);
      toast.success("Admin added");
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this admin?")) {
      persist(admins.filter(a => a.id !== id));
      toast.success("Admin deleted");
    }
  };

  const toggleActive = (id: string) => {
    persist(admins.map(a => a.id === id ? { ...a, active: !a.active } : a));
    toast.success("Status updated");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Root User Panel — Manage HR Head (Admin) accounts for each zone</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Add Admin</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Admin" : "Add Admin"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="HR Head name" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@irctc.com" />
              </div>
              <div className="space-y-1">
                <Label>Username</Label>
                <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editing} placeholder="Login username" />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Login password" />
              </div>
              <div className="space-y-1">
                <Label>Zone</Label>
                <Select value={form.zone} onValueChange={v => setForm({ ...form, zone: v as Zone })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.active ? "active" : "inactive"} onValueChange={v => setForm({ ...form, active: v === "active" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="mt-2 w-full">{editing ? "Update" : "Add"} Admin</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="excel-table">
          <thead>
            <tr>
              <th>Name</th><th>Username</th><th>Email</th><th>Zone</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No admin accounts</td></tr>
            ) : admins.map(admin => (
              <tr key={admin.id}>
                <td className="font-medium">{admin.name}</td>
                <td className="font-mono text-sm">{admin.username}</td>
                <td>{admin.email}</td>
                <td>{admin.zone}</td>
                <td>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${admin.active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                    onClick={() => toggleActive(admin.id)}
                  >
                    {admin.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(admin)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(admin.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Zone coverage overview */}
      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-3">Zone Coverage</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ZONES.map(zone => {
            const admin = admins.find(a => a.zone === zone);
            return (
              <div key={zone} className={`border rounded-lg p-3 ${admin ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                <p className="text-sm font-medium text-foreground">{zone}</p>
                {admin ? (
                  <p className="text-xs text-muted-foreground mt-1">{admin.name} ({admin.username})</p>
                ) : (
                  <p className="text-xs text-destructive mt-1">No admin assigned</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
