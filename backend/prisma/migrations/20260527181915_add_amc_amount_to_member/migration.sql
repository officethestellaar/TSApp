-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "membershipNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tenure" TEXT NOT NULL,
    "nameAsAadhaar" TEXT NOT NULL,
    "fatherHusbandName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "companyName" TEXT,
    "designation" TEXT,
    "aadhaarNumber" TEXT NOT NULL,
    "panNumber" TEXT,
    "gstNumber" TEXT,
    "mobileNumber" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "whatsappNumber" TEXT,
    "email" TEXT,
    "residentialAddress" TEXT NOT NULL,
    "officeAddress" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactNumber" TEXT NOT NULL,
    "referenceName" TEXT,
    "salesExecutiveName" TEXT,
    "photoUrl" TEXT,
    "signatureUrl" TEXT,
    "offerPrice" REAL NOT NULL,
    "membershipFee" REAL NOT NULL,
    "registrationFee" REAL NOT NULL,
    "discountAmount" REAL NOT NULL,
    "netAmount" REAL NOT NULL,
    "gstAmount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentRef" TEXT,
    "receiptNumber" TEXT,
    "bookingDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" DATETIME NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "amcApplicable" BOOLEAN NOT NULL DEFAULT true,
    "amcAmount" REAL NOT NULL DEFAULT 5000,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amcStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "accessStatus" TEXT NOT NULL DEFAULT 'DISABLED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" DATETIME,
    "lastAccess" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "password" TEXT
);
INSERT INTO "new_Member" ("aadhaarNumber", "accessStatus", "alternateMobile", "amcApplicable", "amcStatus", "bloodGroup", "bookingDate", "category", "city", "companyName", "createdAt", "designation", "discountAmount", "dob", "email", "emergencyContactName", "emergencyContactNumber", "expiryDate", "fatherHusbandName", "gender", "gstAmount", "gstNumber", "id", "isActive", "isBlacklisted", "lastAccess", "lastLogin", "maritalStatus", "membershipFee", "membershipNumber", "mobileNumber", "nameAsAadhaar", "nationality", "netAmount", "occupation", "offerPrice", "officeAddress", "panNumber", "password", "paymentMode", "paymentRef", "photoUrl", "pincode", "receiptNumber", "referenceName", "registrationFee", "residentialAddress", "salesExecutiveName", "signatureUrl", "startDate", "state", "status", "tenure", "totalAmount", "updatedAt", "whatsappNumber") SELECT "aadhaarNumber", "accessStatus", "alternateMobile", "amcApplicable", "amcStatus", "bloodGroup", "bookingDate", "category", "city", "companyName", "createdAt", "designation", "discountAmount", "dob", "email", "emergencyContactName", "emergencyContactNumber", "expiryDate", "fatherHusbandName", "gender", "gstAmount", "gstNumber", "id", "isActive", "isBlacklisted", "lastAccess", "lastLogin", "maritalStatus", "membershipFee", "membershipNumber", "mobileNumber", "nameAsAadhaar", "nationality", "netAmount", "occupation", "offerPrice", "officeAddress", "panNumber", "password", "paymentMode", "paymentRef", "photoUrl", "pincode", "receiptNumber", "referenceName", "registrationFee", "residentialAddress", "salesExecutiveName", "signatureUrl", "startDate", "state", "status", "tenure", "totalAmount", "updatedAt", "whatsappNumber" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_membershipNumber_key" ON "Member"("membershipNumber");
CREATE UNIQUE INDEX "Member_aadhaarNumber_key" ON "Member"("aadhaarNumber");
CREATE UNIQUE INDEX "Member_mobileNumber_key" ON "Member"("mobileNumber");
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
