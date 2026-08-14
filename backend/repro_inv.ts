import prisma from './src/lib/prisma';
async function main() {
  const invs = await prisma.invoice.findMany({
    where: { department: { in: ['POS', 'RESTAURANT', 'BANQUET'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  for (const i of invs) {
    const ratio = Number(i.total) > 0 ? ((Number(i.gst) / (Number(i.total) - Number(i.gst))) * 100).toFixed(2) : 'n/a';
    console.log(`${i.department.padEnd(10)} amount=${i.amount} disc=${i.discount} gst=${i.gst} total=${i.total} gstPct=${ratio}% inv=${i.invoiceNumber}`);
  }
}
main().then(() => process.exit(0));
