export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  roleId: number;
  status: string;
  locked: boolean;
  staffProfileId?: string | null;
  staffProfile?: Staff | null;
  defaultCheckIn?: string | null;
  monthlySalary?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  image_url?: string | null;
  display_order?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  membershipNumber: string;
  category: string;
  tenure: string;
  nameAsAadhaar: string;
  fatherHusbandName: string;
  gender: string;
  dob: string;
  maritalStatus: string;
  occupation: string;
  companyName?: string | null;
  designation?: string | null;
  aadhaarNumber: string;
  panNumber?: string | null;
  gstNumber?: string | null;
  mobileNumber: string;
  alternateMobile?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  residentialAddress: string;
  officeAddress?: string | null;
  city: string;
  state: string;
  pincode: string;
  nationality: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  referenceName?: string | null;
  salesExecutiveName?: string | null;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  offerPrice: number | string;
  membershipFee: number | string;
  registrationFee: number | string;
  discountAmount: number | string;
  netAmount: number | string;
  gstAmount: number | string;
  totalAmount: number | string;
  paymentMode: string;
  paymentRef?: string | null;
  receiptNumber?: string | null;
  bookingDate: string;
  startDate: string;
  expiryDate: string;
  validityType?: string;
  amcApplicable: boolean;
  amcAmount?: number | string;
  amcYear?: string;
  ledgerBalance?: number;
  status: string;
  amcStatus: string;
  accessStatus: string;
  isActive: boolean;
  isBlacklisted: boolean;
  lastLogin?: string | null;
  lastAccess?: string | null;
  createdAt: string;
  updatedAt: string;
  familyMembers?: FamilyMember[];
  accessLogs?: AccessLog[];
  affiliateProfile?: FamilyMember;
}

export interface FamilyMember {
  id: number;
  memberId: number;
  membershipNumber?: string | null;
  name: string;
  relation: string;
  dob: string;
  gender: string;
  mobileNumber?: string | null;
  email?: string | null;
  aadhaarNumber?: string | null;
  photoUrl?: string | null;
  biometricId?: string | null;
  qrCode?: string | null;
  accessPermissions?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  member?: Member | null;
  memberId?: number | null;
  walkInGuest?: WalkInGuest | null;
  walkInGuestId?: number | null;
  department: string;
  amount: number | string;
  discount: number | string;
  gst: number | string;
  total: number | string;
  status: string;
  dueDate: string;
  items?: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number | string;
  amount: number | string;
}

export interface RestaurantTable {
  id: number;
  number: string;
  capacity: number;
  status: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number | string;
  department: string;
  isAvailable: boolean;
}

export interface Order {
  id: number;
  orderNumber: string;
  table: RestaurantTable;
  tableId: number;
  member?: Member | null;
  memberId?: number | null;
  paxCount: number;
  status: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItem: MenuItem;
  menuItemId: number;
  quantity: number;
  status: string;
  notes?: string | null;
}

export interface AccessLog {
  id: number;
  member: Member;
  memberId: number;
  deviceIp?: string | null;
  deviceLocation?: string | null;
  accessType: string;
  isAllowed: boolean;
  denialReason?: string | null;
  timestamp: string;
}

export interface Complaint {
  id: number;
  member: Member;
  memberId: number;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  messages?: Message[];
  _count?: {
    messages: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  complaintId: number;
  senderType: 'STAFF' | 'MEMBER';
  senderId: number;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface StaffLeave {
  id: number;
  userId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewedById?: number | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string; email: string; role: Role };
  reviewedBy?: { id: number; name: string } | null;
}

export interface LeaveBalance {
  id: number;
  userId: number;
  earnedLeave: number;
  sickLeave: number;
  casualLeave: number;
  year: number;
  user?: { id: number; name: string; email: string; role: Role };
}

export interface WalkInGuest {
  id: number;
  name: string;
  contact: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  targetAudience: string;
  priority?: string;
  isActive: boolean;
  createdBy: User;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

export interface HousekeepingTask {
  id: number;
  name: string;
  category: string;
  description: string | null;
  floor: string | null;
  isPeriodic: boolean;
  frequencyDays: number | null;
  isDeepClean: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HousekeepingAllocation {
  id: number;
  employeeId: number;
  floor: string;
  area: string;
  shift: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  specification: string | null;
  createdAt: string;
  updatedAt: string;
  employee: { id: number; name: string };
  instances: HousekeepingTaskInstance[];
}

export interface HousekeepingTaskInstance {
  id: number;
  allocationId: number | null;
  taskId: number;
  employeeId: number;
  floor: string;
  area: string;
  priority: string;
  dueTime: string | null;
  status: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  remarks: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  task: HousekeepingTask;
  allocation?: HousekeepingAllocation | null;
  employee?: { id: number; name: string };
}

export interface HousekeepingDeepCleaning {
  id: number;
  floor: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  assignedTo: string | null;
  photos: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HousekeepingDashboard {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  deepCleaningCount: number;
  floorCompletion: { floor: string; total: number; completed: number }[];
  employeePerformance: { employeeId: number; name: string; total: number; completed: number }[];
  kpi: number;
}

export interface StaffAttendance {
  id: number;
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
  overtimeHours: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; email: string; role: { name: string } };
}

export interface StaffSalary {
  id: number;
  userId: number;
  month: number;
  year: number;
  basicPay: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  grossPay: number;
  pf: number;
  esi: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  netPay: number;
  bonus: number;
  reduction: number;
  invoiceNumber: string | null;
  attendanceDays: number;
  paidDays: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paymentDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; email: string; role: { name: string } };
}

export interface Activity {
  id: number;
  name: string;
  description: string;
  location: string;
  capacity: number;
  startTime: string;
  endTime: string;
  category: string;
  image?: string | null;
  timer?: string | null;
  status: string;
  _count?: {
    reservations: number;
  };
}

export interface Feedback {
  id: number;
  memberId: number | null;
  memberName: string | null;
  rating: number;
  comments: string | null;
  department: string;
  isResolved: boolean;
  createdAt: string;
  member?: { mobileNumber: string } | null;
}

export interface Reservation {
  id: number;
  memberId: number;
  activityId: number;
  activity: Activity;
  paxCount: number;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
  notes?: string | null;
  createdAt: string;
}
