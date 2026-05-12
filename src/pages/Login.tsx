import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAsRoot, loginAsAdmin, getAdmins, ROOT_USER } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Check root user
    if (username === ROOT_USER.username && password === ROOT_USER.password) {
      loginAsRoot();
      navigate("/admin-management");
      return;
    }
    // Check zone admins
    const admins = getAdmins();
    const admin = admins.find(a => a.username === username && a.password === password && a.active);
    if (admin) {
      loginAsAdmin(admin.id, admin.zone);
      navigate("/dashboard");
      return;
    }
    setError("Invalid credentials.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">IRCTC HR Portal</CardTitle>
          <CardDescription>Outsourced Employee Attendance & Leave Management</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign In</Button>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Root: root / root@irctc</p>
              <p>Admin: admin / admin123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
