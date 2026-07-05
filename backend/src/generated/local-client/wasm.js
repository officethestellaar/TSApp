
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name',
  roleId: 'roleId',
  status: 'status',
  locked: 'locked',
  pin: 'pin',
  defaultCheckIn: 'defaultCheckIn',
  monthlySalary: 'monthlySalary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  authUserId: 'authUserId',
  resetPasswordToken: 'resetPasswordToken',
  resetPasswordExpires: 'resetPasswordExpires',
  staffProfileId: 'staffProfileId'
};

exports.Prisma.StaffScalarFieldEnum = {
  id: 'id',
  name: 'name',
  role: 'role',
  description: 'description',
  image_url: 'image_url',
  display_order: 'display_order',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.MemberScalarFieldEnum = {
  id: 'id',
  membershipNumber: 'membershipNumber',
  category: 'category',
  tenure: 'tenure',
  nameAsAadhaar: 'nameAsAadhaar',
  fatherHusbandName: 'fatherHusbandName',
  gender: 'gender',
  dob: 'dob',
  maritalStatus: 'maritalStatus',
  occupation: 'occupation',
  companyName: 'companyName',
  designation: 'designation',
  aadhaarNumber: 'aadhaarNumber',
  panNumber: 'panNumber',
  gstNumber: 'gstNumber',
  mobileNumber: 'mobileNumber',
  alternateMobile: 'alternateMobile',
  whatsappNumber: 'whatsappNumber',
  email: 'email',
  residentialAddress: 'residentialAddress',
  officeAddress: 'officeAddress',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  nationality: 'nationality',
  bloodGroup: 'bloodGroup',
  emergencyContactName: 'emergencyContactName',
  emergencyContactNumber: 'emergencyContactNumber',
  referenceName: 'referenceName',
  salesExecutiveName: 'salesExecutiveName',
  photoUrl: 'photoUrl',
  signatureUrl: 'signatureUrl',
  offerPrice: 'offerPrice',
  membershipFee: 'membershipFee',
  registrationFee: 'registrationFee',
  discountAmount: 'discountAmount',
  netAmount: 'netAmount',
  gstAmount: 'gstAmount',
  totalAmount: 'totalAmount',
  paymentMode: 'paymentMode',
  paymentRef: 'paymentRef',
  paymentProofUrl: 'paymentProofUrl',
  receiptNumber: 'receiptNumber',
  bookingDate: 'bookingDate',
  startDate: 'startDate',
  expiryDate: 'expiryDate',
  amcApplicable: 'amcApplicable',
  amcAmount: 'amcAmount',
  status: 'status',
  amcStatus: 'amcStatus',
  accessStatus: 'accessStatus',
  isActive: 'isActive',
  isBlacklisted: 'isBlacklisted',
  lastLogin: 'lastLogin',
  lastAccess: 'lastAccess',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  authUserId: 'authUserId',
  password: 'password',
  resetPasswordToken: 'resetPasswordToken',
  resetPasswordExpires: 'resetPasswordExpires',
  amcYear: 'amcYear',
  ledgerBalance: 'ledgerBalance',
  validityType: 'validityType'
};

exports.Prisma.TableReservationScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  affiliateId: 'affiliateId',
  date: 'date',
  time: 'time',
  paxCount: 'paxCount',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AMCPaymentRequestScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  amount: 'amount',
  transactionRef: 'transactionRef',
  paymentDate: 'paymentDate',
  proofUrl: 'proofUrl',
  status: 'status',
  rejectionReason: 'rejectionReason',
  processedById: 'processedById',
  processedAt: 'processedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActivityScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  location: 'location',
  capacity: 'capacity',
  startTime: 'startTime',
  endTime: 'endTime',
  category: 'category',
  image: 'image',
  timer: 'timer',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnenrollmentRequestScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  reason: 'reason',
  status: 'status',
  rejectionReason: 'rejectionReason',
  processedById: 'processedById',
  processedAt: 'processedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReservationScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  affiliateId: 'affiliateId',
  activityId: 'activityId',
  paxCount: 'paxCount',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FamilyMemberScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  membershipNumber: 'membershipNumber',
  name: 'name',
  relation: 'relation',
  dob: 'dob',
  gender: 'gender',
  mobileNumber: 'mobileNumber',
  email: 'email',
  aadhaarNumber: 'aadhaarNumber',
  photoUrl: 'photoUrl',
  biometricId: 'biometricId',
  qrCode: 'qrCode',
  accessPermissions: 'accessPermissions',
  status: 'status',
  password: 'password',
  resetPasswordToken: 'resetPasswordToken',
  resetPasswordExpires: 'resetPasswordExpires',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNumber: 'invoiceNumber',
  memberId: 'memberId',
  department: 'department',
  amount: 'amount',
  discount: 'discount',
  gst: 'gst',
  roundOff: 'roundOff',
  total: 'total',
  status: 'status',
  cancellationStatus: 'cancellationStatus',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  walkInGuestId: 'walkInGuestId'
};

exports.Prisma.WalkInGuestScalarFieldEnum = {
  id: 'id',
  name: 'name',
  contact: 'contact',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  description: 'description',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  amount: 'amount'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  receiptNumber: 'receiptNumber',
  invoiceId: 'invoiceId',
  amount: 'amount',
  paymentMode: 'paymentMode',
  referenceNumber: 'referenceNumber',
  paymentDate: 'paymentDate',
  receivedById: 'receivedById',
  transactionId: 'transactionId',
  proofUrl: 'proofUrl'
};

exports.Prisma.RestaurantTableScalarFieldEnum = {
  id: 'id',
  number: 'number',
  capacity: 'capacity',
  status: 'status',
  floor: 'floor'
};

exports.Prisma.MenuItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  price: 'price',
  department: 'department',
  isAvailable: 'isAvailable'
};

exports.Prisma.InventoryItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  unit: 'unit',
  currentStock: 'currentStock',
  minStockLevel: 'minStockLevel',
  unitPrice: 'unitPrice',
  lastRestockedAt: 'lastRestockedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryLogScalarFieldEnum = {
  id: 'id',
  itemId: 'itemId',
  change: 'change',
  type: 'type',
  description: 'description',
  performedById: 'performedById',
  createdAt: 'createdAt'
};

exports.Prisma.RecipeScalarFieldEnum = {
  id: 'id',
  menuItemId: 'menuItemId',
  inventoryItemId: 'inventoryItemId',
  quantity: 'quantity',
  exactWeight: 'exactWeight'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  orderNumber: 'orderNumber',
  tableId: 'tableId',
  memberId: 'memberId',
  affiliateId: 'affiliateId',
  paxCount: 'paxCount',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isPrepaid: 'isPrepaid',
  isVerified: 'isVerified'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  menuItemId: 'menuItemId',
  quantity: 'quantity',
  status: 'status',
  notes: 'notes'
};

exports.Prisma.AccessLogScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  affiliateId: 'affiliateId',
  deviceIp: 'deviceIp',
  deviceLocation: 'deviceLocation',
  accessType: 'accessType',
  isAllowed: 'isAllowed',
  denialReason: 'denialReason',
  timestamp: 'timestamp'
};

exports.Prisma.ComplaintScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  affiliateId: 'affiliateId',
  subject: 'subject',
  description: 'description',
  category: 'category',
  status: 'status',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  senderType: 'senderType',
  senderId: 'senderId',
  senderName: 'senderName',
  content: 'content',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  targetAudience: 'targetAudience',
  isActive: 'isActive',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  description: 'description',
  oldData: 'oldData',
  newData: 'newData',
  userId: 'userId',
  userName: 'userName',
  userRole: 'userRole',
  createdAt: 'createdAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  tagNumber: 'tagNumber',
  location: 'location',
  purchaseDate: 'purchaseDate',
  purchaseCost: 'purchaseCost',
  status: 'status',
  lastMaintenance: 'lastMaintenance',
  nextMaintenance: 'nextMaintenance',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaintenanceLogScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  serviceDate: 'serviceDate',
  serviceType: 'serviceType',
  performedBy: 'performedBy',
  cost: 'cost',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeedbackScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  affiliateId: 'affiliateId',
  memberName: 'memberName',
  rating: 'rating',
  comments: 'comments',
  department: 'department',
  isResolved: 'isResolved',
  createdAt: 'createdAt'
};

exports.Prisma.SystemStatusScalarFieldEnum = {
  id: 'id',
  isLocked: 'isLocked',
  lockedAt: 'lockedAt',
  lockedById: 'lockedById',
  reason: 'reason'
};

exports.Prisma.StaffLeaveScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  leaveType: 'leaveType',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  status: 'status',
  reviewedById: 'reviewedById',
  reviewNotes: 'reviewNotes',
  reviewedAt: 'reviewedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveBalanceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  earnedLeave: 'earnedLeave',
  sickLeave: 'sickLeave',
  casualLeave: 'casualLeave',
  year: 'year',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HousekeepingTaskScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  description: 'description',
  isPeriodic: 'isPeriodic',
  frequencyDays: 'frequencyDays',
  isDeepClean: 'isDeepClean',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HousekeepingAllocationScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  floor: 'floor',
  area: 'area',
  shift: 'shift',
  date: 'date',
  startTime: 'startTime',
  endTime: 'endTime',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HousekeepingTaskInstanceScalarFieldEnum = {
  id: 'id',
  allocationId: 'allocationId',
  taskId: 'taskId',
  employeeId: 'employeeId',
  floor: 'floor',
  area: 'area',
  priority: 'priority',
  dueTime: 'dueTime',
  status: 'status',
  assignedAt: 'assignedAt',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  remarks: 'remarks',
  photoUrl: 'photoUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HousekeepingDeepCleaningScalarFieldEnum = {
  id: 'id',
  floor: 'floor',
  date: 'date',
  startTime: 'startTime',
  endTime: 'endTime',
  status: 'status',
  assignedTo: 'assignedTo',
  photos: 'photos',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HousekeepingFloorTemplateScalarFieldEnum = {
  id: 'id',
  floor: 'floor',
  area: 'area',
  tasks: 'tasks',
  frequency: 'frequency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Role: 'Role',
  User: 'User',
  staff: 'staff',
  Member: 'Member',
  TableReservation: 'TableReservation',
  AMCPaymentRequest: 'AMCPaymentRequest',
  Activity: 'Activity',
  UnenrollmentRequest: 'UnenrollmentRequest',
  Reservation: 'Reservation',
  FamilyMember: 'FamilyMember',
  Invoice: 'Invoice',
  WalkInGuest: 'WalkInGuest',
  InvoiceItem: 'InvoiceItem',
  Payment: 'Payment',
  RestaurantTable: 'RestaurantTable',
  MenuItem: 'MenuItem',
  InventoryItem: 'InventoryItem',
  InventoryLog: 'InventoryLog',
  Recipe: 'Recipe',
  Order: 'Order',
  OrderItem: 'OrderItem',
  AccessLog: 'AccessLog',
  Complaint: 'Complaint',
  Message: 'Message',
  Announcement: 'Announcement',
  AuditLog: 'AuditLog',
  Asset: 'Asset',
  MaintenanceLog: 'MaintenanceLog',
  Feedback: 'Feedback',
  SystemStatus: 'SystemStatus',
  StaffLeave: 'StaffLeave',
  LeaveBalance: 'LeaveBalance',
  HousekeepingTask: 'HousekeepingTask',
  HousekeepingAllocation: 'HousekeepingAllocation',
  HousekeepingTaskInstance: 'HousekeepingTaskInstance',
  HousekeepingDeepCleaning: 'HousekeepingDeepCleaning',
  HousekeepingFloorTemplate: 'HousekeepingFloorTemplate'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
