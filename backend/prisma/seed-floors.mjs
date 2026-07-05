import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const floors = [
  { floor: 'Ground', area: 'Cafe & Reception', tasks: JSON.stringify(['Sweep cafe floor','Mop reception area','Clean counter','Dust seating','Clean glass doors','Empty trash bins','Arrange chairs','Clean restrooms']), frequency: 'EVERY_2_HOURS' },
  { floor: 'Lift-1', area: 'Ground to 7th', tasks: JSON.stringify(['Wipe lift doors','Clean mirror','Mop floor','Disinfect buttons','Polish stainless steel','Check ceiling vents']), frequency: 'DAILY' },
  { floor: 'Lift-2', area: '7th to 9th', tasks: JSON.stringify(['Wipe lift doors','Clean mirror','Mop floor','Disinfect buttons','Polish stainless steel','Check ceiling vents']), frequency: 'DAILY' },
  { floor: '1st', area: 'GYM', tasks: JSON.stringify(['Wipe gym equipment','Mop floor','Clean mirrors','Sanitize mats','Empty trash bins','Restock towels']), frequency: 'TWICE_DAILY' },
  { floor: '2nd', area: 'Salon', tasks: JSON.stringify(['Sweep hair clippings','Mop floor','Clean workstations','Sanitize tools','Arrange product shelves','Empty trash bins']), frequency: 'TWICE_DAILY' },
  { floor: '3rd', area: 'Multipurpose Hall', tasks: JSON.stringify(['Sweep floor','Mop entire hall','Dust chairs & tables','Clean stage area','Arrange furniture','Check AV equipment cleanliness']), frequency: 'DAILY' },
  { floor: '4th', area: 'Electrical Room', tasks: JSON.stringify(['Sweep floor','Dust panels & equipment','Check ventilation grills','Clean floor drains','Remove cobwebs']), frequency: 'WEEKLY' },
  { floor: '5th', area: 'Swimming Pool', tasks: JSON.stringify(['Skim pool surface','Mop deck area','Clean pool loungers','Wipe shower area','Restock towels','Empty trash bins','Check chemical station cleanliness']), frequency: 'EVERY_2_HOURS' },
  { floor: '6th', area: 'Banquet & Restaurant', tasks: JSON.stringify(['Sweep dining floor','Mop entire area','Dust tables & chairs','Clean buffet counters','Polish glassware area','Clean restrooms','Empty trash bins']), frequency: 'TWICE_DAILY' },
  { floor: '7th', area: 'Terrace Restaurant', tasks: JSON.stringify(['Sweep terrace floor','Mop dining area','Dust outdoor furniture','Clean glass railings','Arrange umbrellas','Empty trash bins']), frequency: 'TWICE_DAILY' },
  { floor: '8th', area: 'Terrace Restaurant & Balcony', tasks: JSON.stringify(['Sweep terrace & balcony','Mop tiled areas','Dust outdoor seating','Clean balcony railing','Wipe glass partitions','Empty trash bins']), frequency: 'TWICE_DAILY' },
  { floor: '9th', area: 'Premium Lounge & Dining', tasks: JSON.stringify(['Sweep lounge floor','Mop dining area','Dust luxury furniture','Polish bar counter','Clean restrooms','Vacuum carpet area','Empty trash bins']), frequency: 'DAILY' },
];

async function main() {
  for (const f of floors) {
    const existing = await prisma.housekeepingFloorTemplate.findFirst({
      where: { floor: f.floor, area: f.area },
    });
    if (!existing) {
      await prisma.housekeepingFloorTemplate.create({ data: f });
      console.log(`Created: ${f.floor} - ${f.area}`);
    } else {
      console.log(`Skipped (exists): ${f.floor} - ${f.area}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
