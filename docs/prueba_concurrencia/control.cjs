// Control: versión correcta (resta condicionada y atómica). Si la prueba es válida,
// debe aceptar exactamente 3 de 8 salidas y dejar el stock en 1 en todas las ejecuciones.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fixedRegister = async (data, userId) => {
  return await prisma.$transaction(async (tx) => {
    const r = await tx.product.updateMany({
      where: { id: data.productId, currentStock: { gte: data.quantity } },
      data: { currentStock: { decrement: data.quantity } },
    });
    if (r.count === 0) throw new Error('INSUFFICIENT_STOCK');
    return await tx.stockMovement.create({ data: { ...data, userId } });
  });
};

(async () => {
  const u = await prisma.user.create({ data: { name: 'ctl', email: `ctl${Date.now()}@t.com`, passwordHash: 'x' } });
  const c = await prisma.category.create({ data: { name: `ctl${Date.now()}` } });
  const s = await prisma.supplier.create({ data: { name: 'ctl' } });
  let bad = 0;
  for (let run = 1; run <= 10; run++) {
    const p = await prisma.product.create({ data: { name: `ctl-${run}`, purchasePrice: 1, salePrice: 2, currentStock: 10, minStock: 1, categoryId: c.id, supplierId: s.id } });
    const res = await Promise.allSettled(Array.from({ length: 8 }, () => fixedRegister({ productId: p.id, quantity: 3, type: 'OUT' }, u.id)));
    const ok = res.filter(x => x.status === 'fulfilled').length;
    const after = await prisma.product.findUnique({ where: { id: p.id } });
    const wrong = ok !== 3 || after.currentStock !== 1;
    if (wrong) bad++;
    console.log(`run ${String(run).padStart(2)}: aceptadas=${ok} stockFinal=${after.currentStock} ${wrong ? '<-- INCORRECTO' : 'ok'}`);
  }
  console.log(`CONTROL (resta condicionada): ${bad}/10 ejecuciones con resultado incorrecto`);
  await prisma.$disconnect();
})();
