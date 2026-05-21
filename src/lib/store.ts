// Prototype data store using localStorage
export type Zone =
  | "North Zone"
  | "West Zone"
  | "East Zone"
  | "South Zone"
  | "South Central Zone"
  | "Corporate Office";

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  name: string;
  zone: Zone;
  email: string;
  active: boolean;
}

export interface Employee {
  employeeId: string;
  name: string;
  location: string;
  department: string;
  joiningDate: string;
  status: "active" | "inactive";
  zone: Zone;
  exitDate?: string;
}

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  loginTime: string;
  logoutTime: string;
  workingHours: number;
  status: "Present" | "Absent" | "WeekOff";
}

export interface LeaveRecord {
  employeeId: string;
  month: number;
  year: number;
  cl: number;
  pl: number;
  usedLeaves: number;
  unpaidLeaves: number;
  reason?: string;
}

export interface BonusRecord {
  employeeId: string;
  month: string;
  amount: number;
  reason: string;
}

export interface EmployeeRemark {
  employeeId: string;
  text: string;
  date: string;
}

export interface GazettedHoliday {
  date: string;
  name: string;
}

const KEYS = {
  employees: "irctc_employees",
  attendance: "irctc_attendance",
  leaves: "irctc_leaves",
  bonuses: "irctc_bonuses",
  auth: "irctc_auth",
  authRole: "irctc_auth_role",
  authUser: "irctc_auth_user",
  authZone: "irctc_auth_zone",
  remarks: "irctc_remarks",
  holidays: "irctc_holidays",
  admins: "irctc_admins",
};

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Seed data
const seedEmployees: Employee[] = [
  {
    employeeId: "EMP001",
    name: "Rajesh Kumar",
    location: "New Delhi",
    department: "Operations",
    joiningDate: "2023-01-15",
    status: "active",
    zone: "Corporate Office",
  },
  {
    employeeId: "EMP002",
    name: "Priya Sharma",
    location: "New Delhi",
    department: "Catering",
    joiningDate: "2022-06-01",
    status: "active",
    zone: "Corporate Office",
  },
  {
    employeeId: "EMP003",
    name: "Amit Singh",
    location: "New Delhi",
    department: "Ticketing",
    joiningDate: "2023-03-20",
    status: "active",
    zone: "Corporate Office",
  },
  {
    employeeId: "EMP004",
    name: "Sunita Verma",
    location: "New Delhi",
    department: "Housekeeping",
    joiningDate: "2021-11-10",
    status: "active",
    zone: "Corporate Office",
  },
  {
    employeeId: "EMP005",
    name: "Vikram Patel",
    location: "New Delhi",
    department: "IT Support",
    joiningDate: "2024-01-05",
    status: "active",
    zone: "Corporate Office",
  },
  {
    employeeId: "EMP006",
    name: "Meera Nair",
    location: "New Delhi",
    department: "HR",
    joiningDate: "2023-08-15",
    status: "active",
    zone: "Corporate Office",
  },
  {
    employeeId: "EMP007",
    name: "Arjun Reddy",
    location: "New Delhi",
    department: "Finance",
    joiningDate: "2022-12-01",
    status: "inactive",
    zone: "Corporate Office",
    exitDate: "2025-09-30",
  },
  {
    employeeId: "EMP008",
    name: "Kavita Joshi",
    location: "New Delhi",
    department: "Administration",
    joiningDate: "2023-05-10",
    status: "active",
    zone: "Corporate Office",
  },
];

const seedAttendance: AttendanceRecord[] = [];
const now = new Date();
for (let d = 1; d <= Math.min(now.getDate(), 28); d++) {
  const date = new Date(now.getFullYear(), now.getMonth(), d);
  const dayOfWeek = date.getDay();
  seedEmployees.forEach((emp) => {
    if (dayOfWeek === 0) {
      seedAttendance.push({
        employeeId: emp.employeeId,
        date: date.toISOString().split("T")[0],
        loginTime: "",
        logoutTime: "",
        workingHours: 0,
        status: "WeekOff",
      });
    } else if (Math.random() > 0.12) {
      const login = `09:${String(Math.floor(Math.random() * 30)).padStart(2, "0")}`;
      const logout = `18:${String(Math.floor(Math.random() * 30)).padStart(2, "0")}`;
      const hrs = parseFloat((8 + Math.random() * 1.5).toFixed(1));
      seedAttendance.push({
        employeeId: emp.employeeId,
        date: date.toISOString().split("T")[0],
        loginTime: login,
        logoutTime: logout,
        workingHours: hrs,
        status: "Present",
      });
    } else {
      seedAttendance.push({
        employeeId: emp.employeeId,
        date: date.toISOString().split("T")[0],
        loginTime: "",
        logoutTime: "",
        workingHours: 0,
        status: "Absent",
      });
    }
  });
}

const seedAdmins: AdminUser[] = [
  {
    id: "admin1",
    username: "admin",
    password: "admin123",
    name: "Neha Gupta",
    zone: "Corporate Office",
    email: "neha@irctc.com",
    active: true,
  },
  {
    id: "admin2",
    username: "admin_north",
    password: "north123",
    name: "Rahul Mehta",
    zone: "North Zone",
    email: "rahul@irctc.com",
    active: true,
  },
  {
    id: "admin3",
    username: "admin_west",
    password: "west123",
    name: "Sneha Desai",
    zone: "West Zone",
    email: "sneha@irctc.com",
    active: true,
  },
  {
    id: "admin4",
    username: "admin_east",
    password: "east123",
    name: "Ankit Das",
    zone: "East Zone",
    email: "ankit@irctc.com",
    active: true,
  },
  {
    id: "admin5",
    username: "admin_south",
    password: "south123",
    name: "Lakshmi Iyer",
    zone: "South Zone",
    email: "lakshmi@irctc.com",
    active: true,
  },
  {
    id: "admin6",
    username: "admin_sc",
    password: "sc123",
    name: "Ravi Teja",
    zone: "South Central Zone",
    email: "ravi@irctc.com",
    active: true,
  },
];

export function getEmployees(): Employee[] {
  return load(KEYS.employees, seedEmployees);
}
export function setEmployees(data: Employee[]) {
  save(KEYS.employees, data);
}
export function getAttendance(): AttendanceRecord[] {
  return load(KEYS.attendance, seedAttendance);
}
export function setAttendance(data: AttendanceRecord[]) {
  save(KEYS.attendance, data);
}
export function getLeaves(): LeaveRecord[] {
  return load(KEYS.leaves, []);
}
export function setLeaves(data: LeaveRecord[]) {
  save(KEYS.leaves, data);
}
export function getBonuses(): BonusRecord[] {
  return load(KEYS.bonuses, []);
}
export function setBonuses(data: BonusRecord[]) {
  save(KEYS.bonuses, data);
}
export function getRemarks(): EmployeeRemark[] {
  return load(KEYS.remarks, []);
}
export function setRemarks(data: EmployeeRemark[]) {
  save(KEYS.remarks, data);
}
export function getHolidays(): GazettedHoliday[] {
  return load(KEYS.holidays, defaultHolidays);
}
export const getFixedHolidays = (year: number) => {
  return [
    {
      date: `${year}-01-26`,
      name: "Republic Day",
      fixed: true,
    },
    {
      date: `${year}-08-15`,
      name: "Independence Day",
      fixed: true,
    },
    {
      date: `${year}-10-02`,
      name: "Gandhi Jayanti",
      fixed: true,
    },
  ];
};
export function setHolidays(data: GazettedHoliday[]) {
  save(KEYS.holidays, data);
}
export function getAdmins(): AdminUser[] {
  return load(KEYS.admins, seedAdmins);
}
export function setAdmins(data: AdminUser[]) {
  save(KEYS.admins, data);
}

// Root user credentials
export const ROOT_USER = { username: "root", password: "root@irctc" };

export const ZONES: Zone[] = [
  "North Zone",
  "West Zone",
  "East Zone",
  "South Zone",
  "South Central Zone",
  "Corporate Office",
];

// Auth
export type AuthRole = "root" | "admin";
export function isAuthenticated(): boolean {
  return localStorage.getItem(KEYS.auth) === "true";
}
export function getAuthRole(): AuthRole | null {
  return localStorage.getItem(KEYS.authRole) as AuthRole | null;
}
export function getAuthUser(): string | null {
  return localStorage.getItem(KEYS.authUser);
}
export function getAuthZone(): Zone | null {
  return localStorage.getItem(KEYS.authZone) as Zone | null;
}

export function loginAsRoot() {
  localStorage.setItem(KEYS.auth, "true");
  localStorage.setItem(KEYS.authRole, "root");
  localStorage.setItem(KEYS.authUser, "root");
  localStorage.removeItem(KEYS.authZone);
}
export function loginAsAdmin(adminId: string, zone: Zone) {
  localStorage.setItem(KEYS.auth, "true");
  localStorage.setItem(KEYS.authRole, "admin");
  localStorage.setItem(KEYS.authUser, adminId);
  localStorage.setItem(KEYS.authZone, zone);
}
export function login() {
  loginAsRoot();
}
export function logout() {
  localStorage.removeItem(KEYS.auth);
  localStorage.removeItem(KEYS.authRole);
  localStorage.removeItem(KEYS.authUser);
  localStorage.removeItem(KEYS.authZone);
}

// Default gazetted holidays
const defaultHolidays: GazettedHoliday[] = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
];

export function getWorkingDays(
  year: number,
  month: number,
  holidays?: GazettedHoliday[],
): {
  total: number;
  sundays: number;
  totalSaturdays: number;
  saturdaysOff: number;
  workingSaturdays: number;
  calendarDays: number;
  holidayCount: number;
} {
  const daysInMonth = new Date(year, month, 0).getDate();
  let sundays = 0;
  let totalSaturdays = 0;
  const allHolidays = holidays || getHolidays();
  const monthHolidays = allHolidays.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day === 0) sundays++;
    if (day === 6) totalSaturdays++;
  }
  const saturdaysOff = 2;
  const workingSaturdays = totalSaturdays - saturdaysOff;
  const holidayCount = monthHolidays.length;
  const total = daysInMonth - sundays - saturdaysOff - holidayCount;
  return {
    total,
    sundays,
    totalSaturdays,
    saturdaysOff,
    workingSaturdays,
    calendarDays: daysInMonth,
    holidayCount,
  };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const LEAVE_REASONS = [
  "Sick Leave",
  "Personal Work",
  "Family Emergency",
  "Medical Appointment",
  "Festival / Religious",
  "Travel",
  "Other",
];

export const getWorkingDaysCycle = (
  year: number,
  month: number,
  holidays: any[],
) => {
  // Start: 23rd of selected month
  const start = new Date(year, month - 1, 23);

  // End: 22nd of next month
  const nextMonth = month === 12 ? 0 : month;
  const nextYear = month === 12 ? year + 1 : year;

  const end = new Date(nextYear, nextMonth, 22);

  let calendarDays = 0;
  let sundays = 0;
  let totalSaturdays = 0;
  let saturdaysOff = 0;
  let workingSaturdays = 0;
  let holidayCount = 0;

  const holidaySet = new Set(holidays.map((h) => h.date));

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    calendarDays++;

    const day = d.getDay();
    const dateStr = d.toISOString().split("T")[0];

    if (day === 0) sundays++;
    if (day === 6) {
      totalSaturdays++;

      // Example logic (adjust if needed)
      if (totalSaturdays % 2 === 0) saturdaysOff++;
      else workingSaturdays++;
    }

    if (holidaySet.has(dateStr)) {
      holidayCount++;
    }
  }

  const total = calendarDays - sundays - saturdaysOff - holidayCount;

  return {
    calendarDays,
    sundays,
    totalSaturdays,
    saturdaysOff,
    workingSaturdays,
    holidayCount,
    total,
  };
};
