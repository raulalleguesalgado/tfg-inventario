// Prueba de concurrencia del módulo de movimientos: versión refinada vs. básica.
// El código de ambos servicios/repositorios está copiado literalmente de
// tfg-inventario-restructuracion (refinado: prompts/07_movements_refinado.md;
// básico: src/services/movement.service.js + src/repositories/movement.repository.js).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ---------- REFINADO (literal de prompts/07_movements_refinado.md) ----------
const movementRepository = {
  create: async (data, tx) => {
    return await tx.stockMovement.create({ data });
  },
};
const refinedService = {
  register: async (data, userId) => {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: data.productId }
      });
      if (!product) throw new Error('PRODUCT_NOT_FOUND');

      let newStock = product.currentStock;
      if (data.type === 'IN') {
        newStock += data.quantity;
      } else if (data.type === 'OUT') {
        if (product.currentStock < data.quantity) throw new Error('INSUFFICIENT_STOCK');
        newStock -= data.quantity;
      } else if (data.type === 'ADJUSTMENT') {
        newStock = data.quantity;
      }

      await tx.product.update({
        where: { id: data.productId },
        data: { currentStock: newStock }
      });
      return await movementRepository.create({ ...data, userId }, tx);
    });
  },
};

// ---------- BÁSICO (literal de src/, desplegado en la app auditada) ----------
const basicCreateMovement = async (data) => {
  return await prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: { quantity: data.quantity, type: data.type, notes: data.notes, productId: data.productId, userId: data.userId },
    });
    const stockAdjustment = data.type === 'OUT' ? -data.quantity : data.quantity;
    await tx.product.update({ where: { id: data.productId }, data: { currentStock: { increment: stockAdjustment } } });
    return movement;
  });
};
const basicRegister = async (data) => {
  const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { currentStock: true } });
  if (!product) throw new Error('Product not found');
  if (data.type === 'OUT' && product.currentStock < data.quantity) throw new Error('Insufficient stock for this movement');
  return await basicCreateMovement(data);
};

// ---------- Ataque: stock 10, 8 salidas OUT de 3 en paralelo ----------
async function attack(label, fn, userId, catId, supId, run) {
  const p = await prisma.product.create({
    data: { name: `race-${label}-${run}`, purchasePrice: 1, salePrice: 2, currentStock: 10, minStock: 1, categoryId: catId, supplierId: supId },
  });
  const calls = Array.from({ length: 8 }, () => fn({ productId: p.id, quantity: 3, type: 'OUT' }, userId));
  const res = await Promise.allSettled(calls);
  const ok = res.filter(r => r.status === 'fulfilled').length;
  const errs = [...new Set(res.filter(r => r.status === 'rejected').map(r => r.reason.message.split('\n').pop().slice(0, 60)))];
  const after = await prisma.product.findUnique({ where: { id: p.id } });
  const movs = await prisma.stockMovement.count({ where: { productId: p.id } });
  return { ok, finalStock: after.currentStock, movements: movs, unitsOut: movs * 3, errs };
}

(async () => {
  const u = await prisma.user.create({ data: { name: 'race', email: `race${Date.now()}@t.com`, passwordHash: 'x', role: 'ADMIN' } });
  const c = await prisma.category.create({ data: { name: `cat${Date.now()}` } });
  const s = await prisma.supplier.create({ data: { name: 'sup' } });
  const RUNS = 10;
  for (const [label, fn] of [['REFINADO', refinedService.register], ['BASICO', (d, uid) => basicRegister({ ...d, userId: uid })]]) {
    console.log(`\n== ${label}: stock inicial 10, 8 x OUT de 3 (máximo correcto: 3 aceptadas, stock final 1) ==`);
    let bad = 0;
    for (let r = 1; r <= RUNS; r++) {
      const x = await attack(label, fn, u.id, c.id, s.id, r);
      const wrong = x.ok > 3 || x.finalStock < 0 || x.finalStock !== 10 - x.unitsOut;
      if (wrong) bad++;
      console.log(`run ${String(r).padStart(2)}: aceptadas=${x.ok} movimientos=${x.movements} (salen ${x.unitsOut} uds) stockFinal=${x.finalStock} ${wrong ? '<-- INCORRECTO' : 'ok'} ${x.errs.length ? JSON.stringify(x.errs) : ''}`);
    }
    console.log(`${label}: ${bad}/${RUNS} ejecuciones con resultado incorrecto`);
  }
  await prisma.$disconnect();
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
