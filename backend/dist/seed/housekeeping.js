"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedHousekeeping = seedHousekeeping;
const prisma_1 = __importDefault(require("../lib/prisma"));
const FLOOR_TEMPLATES = [
    // 1st Floor – Gym
    { floor: '1st - Gym', area: 'Gym', tasks: ['Floor cleaning', 'Equipment dusting', 'Mirror cleaning', 'Reception cleaning', 'Garbage removal', 'Air freshener check'], frequency: 'EVERY_2_HOURS' },
    { floor: '1st - Gym', area: 'Washroom 1', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal', 'Air freshener check'], frequency: 'EVERY_2_HOURS' },
    { floor: '1st - Gym', area: 'Washroom 2', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal', 'Air freshener check'], frequency: 'EVERY_2_HOURS' },
    { floor: '1st - Gym', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '1st - Gym', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 2nd Floor – Salon
    { floor: '2nd - Salon', area: 'Salon', tasks: ['Floor cleaning', 'Mirror cleaning', 'Furniture cleaning', 'Reception cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '2nd - Salon', area: 'Washroom 1', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '2nd - Salon', area: 'Washroom 2', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '2nd - Salon', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '2nd - Salon', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 3rd Floor – Salon
    { floor: '3rd - Salon', area: 'Salon', tasks: ['Floor cleaning', 'Equipment dusting'], frequency: 'DAILY' },
    { floor: '3rd - Salon', area: 'Washroom 1', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'DAILY' },
    { floor: '3rd - Salon', area: 'Washroom 2', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'DAILY' },
    { floor: '3rd - Salon', area: 'Washroom 3', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'DAILY' },
    { floor: '3rd - Salon', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '3rd - Salon', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 4th Floor – Electrical & Server Room
    { floor: '4th - Electrical & Server', area: 'Electrical Room', tasks: ['Dusting', 'Dry mopping', 'Electrical room cleaning'], frequency: 'DAILY' },
    { floor: '4th - Electrical & Server', area: 'Server Room', tasks: ['Dusting', 'Dry mopping'], frequency: 'DAILY' },
    { floor: '4th - Electrical & Server', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting'], frequency: 'EVERY_2_HOURS' },
    { floor: '4th - Electrical & Server', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 5th Floor – Swimming Pool
    { floor: '5th - Pool', area: 'Swimming Pool', tasks: ['Pool deck cleaning', 'Furniture cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '5th - Pool', area: 'Steam Room', tasks: ['Steam room cleaning', 'Sanitization'], frequency: 'EVERY_2_HOURS' },
    { floor: '5th - Pool', area: 'Washroom 1', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '5th - Pool', area: 'Washroom 2', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '5th - Pool', area: 'Washroom 3', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '5th - Pool', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '5th - Pool', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 6th Floor – Banquet & Restaurant
    { floor: '6th - Banquet & Restaurant', area: 'Banquet Hall', tasks: ['Floor cleaning', 'Carpet vacuum cleaning', 'Furniture cleaning'], frequency: 'MORNING_NIGHT' },
    { floor: '6th - Banquet & Restaurant', area: 'Restaurant', tasks: ['Floor cleaning', 'Furniture cleaning', 'Restaurant cleaning'], frequency: 'MORNING_NIGHT' },
    { floor: '6th - Banquet & Restaurant', area: 'Carpet Area', tasks: ['Carpet vacuum cleaning'], frequency: 'MORNING_NIGHT' },
    { floor: '6th - Banquet & Restaurant', area: 'Washroom 1', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '6th - Banquet & Restaurant', area: 'Washroom 2', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '6th - Banquet & Restaurant', area: 'Washroom 3', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '6th - Banquet & Restaurant', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '6th - Banquet & Restaurant', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 7th Floor – Open Terrace Restaurant
    { floor: '7th - Terrace Restaurant', area: 'Restaurant', tasks: ['Restaurant cleaning', 'Terrace cleaning'], frequency: 'MORNING_NIGHT' },
    { floor: '7th - Terrace Restaurant', area: 'Kitchen', tasks: ['Kitchen cleaning', 'Garbage disposal'], frequency: 'MORNING_NIGHT' },
    { floor: '7th - Terrace Restaurant', area: 'Washroom 1', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '7th - Terrace Restaurant', area: 'Washroom 2', tasks: ['Washroom cleaning', 'Sanitization', 'Garbage removal'], frequency: 'EVERY_2_HOURS' },
    { floor: '7th - Terrace Restaurant', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '7th - Terrace Restaurant', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 8th Floor – Open Terrace Restaurant
    { floor: '8th - Terrace Restaurant', area: 'Restaurant', tasks: ['Restaurant cleaning', 'Furniture cleaning'], frequency: 'MORNING_NIGHT' },
    { floor: '8th - Terrace Restaurant', area: 'Open Balcony', tasks: ['Balcony cleaning', 'Furniture cleaning'], frequency: 'MORNING_NIGHT' },
    { floor: '8th - Terrace Restaurant', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '8th - Terrace Restaurant', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // 9th Floor – Premium Lounge
    { floor: '9th - Premium Lounge', area: 'Premium Lounge', tasks: ['Lounge cleaning', 'Sofa cleaning', 'Glass cleaning'], frequency: 'MORNING_NIGHT' },
    { floor: '9th - Premium Lounge', area: 'Open Smoking Area', tasks: ['Smoking area cleaning', 'Garbage removal'], frequency: 'MORNING_NIGHT' },
    { floor: '9th - Premium Lounge', area: 'Lift Lobby', tasks: ['Sweeping', 'Mopping', 'Dusting', 'Glass cleaning'], frequency: 'EVERY_2_HOURS' },
    { floor: '9th - Premium Lounge', area: 'Staircase', tasks: ['Sweeping', 'Mopping', 'Handrail cleaning'], frequency: 'TWICE_DAILY' },
    // Common Areas
    { floor: 'Common Areas', area: 'Store Room', tasks: ['Sweeping', 'Mopping', 'Arrangement'], frequency: 'DAILY' },
];
const ALL_TASKS = [
    // High Priority
    { name: 'Washroom cleaning', category: 'HIGH', description: 'Complete washroom cleaning including fixtures' },
    { name: 'Swimming pool cleaning', category: 'HIGH', description: 'Pool deck and water surface cleaning' },
    { name: 'Restaurant cleaning', category: 'HIGH', description: 'Full restaurant floor and surface cleaning' },
    { name: 'Kitchen cleaning', category: 'HIGH', description: 'Kitchen deep cleaning including countertops' },
    { name: 'Banquet cleaning', category: 'HIGH', description: 'Banquet hall cleaning after events' },
    { name: 'Garbage disposal', category: 'HIGH', description: 'Collect and dispose all garbage' },
    { name: 'Spill cleaning', category: 'HIGH', description: 'Immediate spill response cleaning' },
    // Medium Priority
    { name: 'Floor mopping', category: 'MEDIUM', description: 'Wet mopping of all floor surfaces' },
    { name: 'Dusting', category: 'MEDIUM', description: 'Surface dusting of all fixtures' },
    { name: 'Glass cleaning', category: 'MEDIUM', description: 'Window and mirror glass cleaning' },
    { name: 'Lift lobby cleaning', category: 'MEDIUM', description: 'Lift lobby comprehensive cleaning' },
    { name: 'Staircase cleaning', category: 'MEDIUM', description: 'Staircase sweeping and mopping' },
    { name: 'Handrail cleaning', category: 'MEDIUM', description: 'Handrail disinfection and cleaning' },
    { name: 'Furniture cleaning', category: 'MEDIUM', description: 'Dust and polish all furniture' },
    { name: 'Mirror cleaning', category: 'MEDIUM', description: 'Streak-free mirror cleaning' },
    { name: 'Reception cleaning', category: 'MEDIUM', description: 'Reception area cleaning' },
    { name: 'Carpet vacuum cleaning', category: 'MEDIUM', description: 'Carpet vacuuming' },
    { name: 'Sofa cleaning', category: 'MEDIUM', description: 'Sofa vacuum and spot cleaning' },
    { name: 'Terrace cleaning', category: 'MEDIUM', description: 'Open terrace sweeping and mopping' },
    { name: 'Balcony cleaning', category: 'MEDIUM', description: 'Balcony sweeping and mopping' },
    { name: 'Pool deck cleaning', category: 'MEDIUM', description: 'Pool deck mopping' },
    { name: 'Steam room cleaning', category: 'MEDIUM', description: 'Steam room sanitization' },
    { name: 'Equipment dusting', category: 'MEDIUM', description: 'Gym/salon equipment dusting' },
    // Low Priority
    { name: 'Deep cleaning', category: 'LOW', description: 'Comprehensive deep cleaning', isDeepClean: true },
    { name: 'Solar panel cleaning', category: 'LOW', description: 'Solar panel dusting and cleaning', isPeriodic: true, frequencyDays: 10 },
    { name: 'AC filter cleaning', category: 'LOW', description: 'AC filter washing', isPeriodic: true, frequencyDays: 15 },
    { name: 'Store cleaning', category: 'LOW', description: 'Store room organization and cleaning' },
    { name: 'Air freshener check', category: 'MEDIUM', description: 'Check and refill air fresheners' },
    { name: 'Ceiling cleaning', category: 'LOW', description: 'Ceiling cobweb and dust removal', isDeepClean: true },
    { name: 'Wall cleaning', category: 'LOW', description: 'Wall spot cleaning', isDeepClean: true },
    { name: 'Fan cleaning', category: 'LOW', description: 'Ceiling fan dusting', isDeepClean: true },
    { name: 'Light fixtures cleaning', category: 'LOW', description: 'Light fixture dusting', isDeepClean: true },
    { name: 'Furniture polishing', category: 'LOW', description: 'Furniture polish and shine', isDeepClean: true },
    { name: 'Deep scrubbing', category: 'LOW', description: 'Floor deep scrubbing', isDeepClean: true },
    { name: 'Washroom deep cleaning', category: 'LOW', description: 'Washroom deep clean', isDeepClean: true },
    { name: 'Drain cleaning', category: 'LOW', description: 'Drain unclogging and cleaning', isDeepClean: true },
    { name: 'Sanitization', category: 'HIGH', description: 'Full surface sanitization' },
    { name: 'Upholstery cleaning', category: 'LOW', description: 'Upholstery deep cleaning', isDeepClean: true },
    { name: 'Carpet shampooing', category: 'LOW', description: 'Carpet shampooing', isDeepClean: true },
    { name: 'Kitchen deep cleaning', category: 'LOW', description: 'Kitchen deep clean', isDeepClean: true },
    { name: 'Steam room deep cleaning', category: 'LOW', description: 'Steam room deep clean', isDeepClean: true },
    { name: 'Arrangement', category: 'MEDIUM', description: 'Organize and arrange items' },
    { name: 'Sweeping', category: 'MEDIUM', description: 'Dry sweeping of floors' },
    { name: 'Mopping', category: 'MEDIUM', description: 'Wet mopping of floors' },
    { name: 'Electrical room cleaning', category: 'MEDIUM', description: 'Electrical room dusting and cleaning' },
    { name: 'Smoking area cleaning', category: 'MEDIUM', description: 'Smoking area cleaning and ash removal' },
];
const DEEP_CLEANING_SCHEDULE = [
    { day: 'Monday', floor: '1st - Gym' },
    { day: 'Tuesday', floor: '2nd - Salon' },
    { day: 'Wednesday', floor: '3rd - Salon' },
    { day: 'Thursday', floor: '5th - Pool' },
    { day: 'Friday', floor: '6th - Banquet & Restaurant' },
    { day: 'Saturday', floor: '7th - Terrace Restaurant' },
    { day: 'Sunday', floor: '9th - Premium Lounge' },
];
async function seedHousekeeping() {
    console.log('🌱 Seeding housekeeping data...');
    // 1. Seed master tasks
    for (const task of ALL_TASKS) {
        await prisma_1.default.housekeepingTask.upsert({
            where: { id: 0 }, // will never match, creates new
            update: {},
            create: task,
        }).catch(() => {
            // id-based upsert fails, use create with skip on conflict
        });
    }
    // Use createMany with skipDuplicates where possible
    const existingTasks = await prisma_1.default.housekeepingTask.count();
    if (existingTasks < ALL_TASKS.length) {
        const newTasks = ALL_TASKS.slice(existingTasks);
        for (const t of newTasks) {
            await prisma_1.default.housekeepingTask.create({ data: t });
        }
        console.log(`  ✅ Created ${newTasks.length} new tasks`);
    }
    else {
        console.log(`  ✅ ${existingTasks} tasks already exist`);
    }
    // 2. Seed floor templates
    await prisma_1.default.housekeepingFloorTemplate.deleteMany();
    for (const tmpl of FLOOR_TEMPLATES) {
        await prisma_1.default.housekeepingFloorTemplate.create({
            data: {
                floor: tmpl.floor,
                area: tmpl.area,
                tasks: JSON.stringify(tmpl.tasks),
                frequency: tmpl.frequency,
            },
        });
    }
    console.log(`  ✅ Created ${FLOOR_TEMPLATES.length} floor templates`);
    // 3. Auto-create deep cleaning schedule for next 30 days
    const existingDC = await prisma_1.default.housekeepingDeepCleaning.count({
        where: { date: { gte: new Date() } },
    });
    if (existingDC === 0) {
        const dayMap = {};
        DEEP_CLEANING_SCHEDULE.forEach(s => { dayMap[s.day] = s.floor; });
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const floor = dayMap[dayName];
            if (floor) {
                await prisma_1.default.housekeepingDeepCleaning.create({
                    data: {
                        floor,
                        date,
                        startTime: '10:00',
                        endTime: '11:00',
                        status: 'PENDING',
                    },
                });
            }
            // Monthly for 4th and 8th floor (1st of month)
            if (date.getDate() === 1) {
                for (const f of ['4th - Electrical & Server', '8th - Terrace Restaurant']) {
                    await prisma_1.default.housekeepingDeepCleaning.create({
                        data: { floor: f, date, startTime: '10:00', endTime: '11:00', status: 'PENDING' },
                    });
                }
            }
        }
        console.log('  ✅ Generated deep cleaning schedule for 30 days');
    }
    else {
        console.log(`  ✅ ${existingDC} deep cleaning records exist`);
    }
    console.log('🌱 Housekeeping seeding complete');
    return { tasks: ALL_TASKS.length, templates: FLOOR_TEMPLATES.length };
}
