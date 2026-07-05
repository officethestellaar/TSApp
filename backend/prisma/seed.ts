import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    'SUPER_ADMIN',
    'ADMIN',
    'DATA_OPERATOR',
    'SALES_EXECUTIVE',
    'OPERATIONS_MANAGER',
    'CLUB_MANAGER',
    'MEMBER_BLUE',
    'MEMBER_SILVER',
    'MEMBER_GOLD',
    'HOUSEKEEPING_EXECUTIVE',
    'CHEF',
    'WAITER',
    'ACCOUNTANT',
    'RECEPTIONIST',
    'HOUSEKEEPING_SUPERVISOR',
    'SALON_MANAGER',
    'RESTAURANT_MANAGER',
  ];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  if (superAdminRole) {
    const admins = [
      { email: 'admin@stellaar.com', password: 'admin123', name: 'Super Admin' },
      { email: 'office.thestellaar@gmail.com', password: 'TheStellaar@123_admin', name: 'Office Admin' },
    ];
    for (const admin of admins) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      await prisma.user.upsert({
        where: { email: admin.email },
        update: {},
        create: {
          email: admin.email,
          password: hashedPassword,
          name: admin.name,
          roleId: superAdminRole.id,
        },
      });
    }
  }

  // Seed Restaurant Tables
  const tableCount = await prisma.restaurantTable.count();
  if (tableCount === 0) {
    const tables = [
      { number: '1', capacity: 4, floor: 'Floor 7' },
      { number: '2', capacity: 4, floor: 'Floor 7' },
      { number: '3', capacity: 2, floor: 'Floor 8' },
      { number: '4', capacity: 6, floor: 'Floor 8' },
      { number: '5', capacity: 8, floor: 'Floor 9' },
      { number: '6', capacity: 4, floor: 'Floor 9' },
    ];
    for (const table of tables) {
      await prisma.restaurantTable.create({ data: table });
    }
    console.log('Restaurant tables seeded');
  }

  // Seed Menu Items
  const menuCount = await prisma.menuItem.count();
  if (menuCount === 0) {
    const menuItems = [
      { name: 'Paneer Tikka', category: 'STARTER', price: 280 },
      { name: 'Chicken 65', category: 'STARTER', price: 320 },
      { name: 'Dal Makhani', category: 'MAIN_COURSE', price: 250 },
      { name: 'Butter Chicken', category: 'MAIN_COURSE', price: 450 },
      { name: 'Garlic Naan', category: 'BREAD', price: 60 },
      { name: 'Veg Biryani', category: 'MAIN_COURSE', price: 300 },
      { name: 'Fresh Lime Soda', category: 'BEVERAGE', price: 90 },
      { name: 'Vanilla Ice Cream', category: 'DESSERT', price: 120 },
    ];
    for (const item of menuItems) {
      await prisma.menuItem.create({ data: item });
    }
    console.log('Menu items seeded');
  }

  // Seed a sample Member
  const memberCount = await prisma.member.count();
  if (memberCount === 0) {
    const today = new Date();
    const expiry = new Date();
    expiry.setFullYear(today.getFullYear() + 1);

    const memberPassword = await bcrypt.hash('member123', 10);
    await prisma.member.create({
      data: {
        membershipNumber: 'STEL-2026-001',
        category: 'GOLD',
        tenure: '1_YEAR',
        nameAsAadhaar: 'John Doe',
        fatherHusbandName: 'Richard Doe',
        gender: 'MALE',
        dob: new Date('1990-05-15'),
        maritalStatus: 'MARRIED',
        occupation: 'Business',
        aadhaarNumber: '123456789012',
        mobileNumber: '9876543210',
        email: 'john@example.com',
        password: memberPassword,
        residentialAddress: '123 Club Road, Green City',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        nationality: 'INDIAN',
        bloodGroup: 'O+',
        emergencyContactName: 'Jane Doe',
        emergencyContactNumber: '9876543211',
        offerPrice: 50000,
        membershipFee: 45000,
        registrationFee: 5000,
        discountAmount: 0,
        netAmount: 50000,
        gstAmount: 9000,
        totalAmount: 59000,
        paymentMode: 'UPI',
        startDate: today,
        expiryDate: expiry,
        status: 'APPROVED',
        amcStatus: 'PAID',
        accessStatus: 'ENABLED',
      }
    });
    console.log('Sample member seeded with password');
  }

  // Seed Activities
  const activityCount = await prisma.activity.count();
  if (activityCount === 0) {
    const activities = [
      {
        name: 'Yoga in the Estate',
        description: 'Sunrise yoga session overlooking the pristine estate gardens.',
        location: 'West Garden',
        capacity: 15,
        startTime: new Date(new Date().setHours(6, 0, 0, 0)),
        endTime: new Date(new Date().setHours(7, 30, 0, 0)),
        category: 'EVENT',
      },
      {
        name: 'Gourmet Wine Tasting',
        description: 'An evening of fine wines and artisanal cheeses in the Vault.',
        location: 'The Vault',
        capacity: 10,
        startTime: new Date(new Date().setHours(19, 0, 0, 0)),
        endTime: new Date(new Date().setHours(21, 0, 0, 0)),
        category: 'EVENT',
      },
      {
        name: 'Junior Tennis Workshop',
        description: 'Pro-coaching for the younger generation of Stellaar members.',
        location: 'Tennis Court 2',
        capacity: 8,
        startTime: new Date(new Date().setHours(16, 0, 0, 0)),
        endTime: new Date(new Date().setHours(18, 0, 0, 0)),
        category: 'EVENT',
      }
    ];
    for (const activity of activities) {
      await prisma.activity.create({ data: activity });
    }
    console.log('Sample activities seeded');
  }

  // Seed Assets
  const assetCount = await prisma.asset.count();
  if (assetCount === 0) {
    const assets = [
      { name: 'Treadmill X1000', category: 'GYM', tagNumber: 'GYM-001', location: 'Main Gym', purchaseDate: new Date('2025-01-10'), purchaseCost: 85000, status: 'OPERATIONAL' },
      { name: 'Pool Filtration System', category: 'POOL', tagNumber: 'POOL-001', location: 'Plant Room', purchaseDate: new Date('2024-11-20'), purchaseCost: 250000, status: 'MAINTENANCE' },
      { name: 'Leather Sofa Set', category: 'FURNITURE', tagNumber: 'FUR-001', location: 'Main Lobby', purchaseDate: new Date('2025-03-05'), purchaseCost: 120000, status: 'OPERATIONAL' },
      { name: 'Projector 4K', category: 'IT', tagNumber: 'IT-001', location: 'Conference Hall', purchaseDate: new Date('2025-02-15'), purchaseCost: 45000, status: 'OPERATIONAL' },
    ];
    for (const asset of assets) {
      await prisma.asset.create({ data: asset });
    }
    console.log('Sample assets seeded');
  }

  // Seed Inventory
  const inventoryCount = await prisma.inventoryItem.count();
  if (inventoryCount === 0) {
    const items = [
      { name: 'Paneer', category: 'DAIRY', unit: 'kg', currentStock: 25, minStockLevel: 5, unitPrice: 450 },
      { name: 'Chicken Breast', category: 'MEAT', unit: 'kg', currentStock: 40, minStockLevel: 10, unitPrice: 380 },
      { name: 'Mixed Spices', category: 'DRY_GOODS', unit: 'kg', currentStock: 15, minStockLevel: 3, unitPrice: 600 },
      { name: 'Amul Butter', category: 'DAIRY', unit: 'kg', currentStock: 10, minStockLevel: 2, unitPrice: 550 },
      { name: 'Basmati Rice', category: 'DRY_GOODS', unit: 'kg', currentStock: 100, minStockLevel: 20, unitPrice: 120 },
    ];
    for (const item of items) {
      await prisma.inventoryItem.create({ data: item });
    }
    console.log('Sample inventory seeded');

    // Seed Recipes
    const paneerTikka = await prisma.menuItem.findFirst({ where: { name: 'Paneer Tikka' } });
    const butterChicken = await prisma.menuItem.findFirst({ where: { name: 'Butter Chicken' } });
    
    const paneer = await prisma.inventoryItem.findFirst({ where: { name: 'Paneer' } });
    const chicken = await prisma.inventoryItem.findFirst({ where: { name: 'Chicken Breast' } });
    const spices = await prisma.inventoryItem.findFirst({ where: { name: 'Mixed Spices' } });
    const butter = await prisma.inventoryItem.findFirst({ where: { name: 'Amul Butter' } });

    if (paneerTikka && paneer && spices) {
      await prisma.recipe.createMany({
        data: [
          { menuItemId: paneerTikka.id, inventoryItemId: paneer.id, quantity: 0.2 }, // 200g
          { menuItemId: paneerTikka.id, inventoryItemId: spices.id, quantity: 0.05 }, // 50g
        ]
      });
    }

    if (butterChicken && chicken && butter && spices) {
      await prisma.recipe.createMany({
        data: [
          { menuItemId: butterChicken.id, inventoryItemId: chicken.id, quantity: 0.25 }, // 250g
          { menuItemId: butterChicken.id, inventoryItemId: butter.id, quantity: 0.03 }, // 30g
          { menuItemId: butterChicken.id, inventoryItemId: spices.id, quantity: 0.02 }, // 20g
        ]
      });
    }
    console.log('Sample recipes seeded');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
