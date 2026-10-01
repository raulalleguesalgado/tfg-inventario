# Prueba de concurrencia del módulo de movimientos refinado

**Fecha:** 2026-09-28
**Entorno:** PostgreSQL 16.13 en Docker (aislamiento por defecto: `read committed`),
Prisma Client 5.22.0, Node.js 22.20.0. Esquema: `prisma/schema.prisma` del repositorio.
**Scripts y salidas:** `docs/prueba_concurrencia/`

## Motivo

`prompts/07_movements_refinado.md` daba por corregida la condición de carrera TOCTOU (S3)
porque el código refinado mete la lectura, la validación y la escritura del stock dentro
de `prisma.$transaction`, tal como pedía la regla del prompt. Esa corrección nunca se
había probado con peticiones concurrentes: el ataque de la Fase 4B (stock 10, 8 salidas
de 3 unidades en paralelo) solo se lanzó contra la versión básica, que es la desplegada.

En PostgreSQL, con el nivel de aislamiento por defecto (`read committed`), un `SELECT`
normal dentro de una transacción no bloquea la fila, así que la transacción por sí sola
no debería impedir la carrera.

## Método

`race.cjs` contiene, copiados literalmente:

- **Refinado:** `movementService.register` y `movementRepository.create` de
  `prompts/07_movements_refinado.md`.
- **Básico:** `register` de `src/services/movement.service.js` y `createMovement` de
  `src/repositories/movement.repository.js`.

Para cada versión se crea un producto con `currentStock = 10` y se lanzan 8 salidas `OUT`
de 3 unidades en paralelo. El resultado correcto es: 3 aceptadas, stock final 1. Se repite
10 veces por versión.

`control.cjs` repite el mismo ataque con una versión correcta (resta condicionada y
atómica: `updateMany` con `currentStock >= cantidad` y `decrement`), para comprobar que la
prueba distingue un código correcto de uno incorrecto.

La prueba llama directamente al servicio, sin pasar por HTTP: la carrera está en la lógica
del servicio y la base de datos, no en la capa HTTP. Al lanzar las llamadas desde un mismo
proceso, la concurrencia es algo mayor que en el ataque por HTTP de la Fase 4B.

## Resultados

| Versión | Ejecuciones incorrectas | Resultado típico |
|---|---|---|
| Refinado | **10/10** | 8 aceptadas, 24 unidades registradas como salida, stock final **7** (4 en la primera repetición) |
| Básico | 10/10 | 8 aceptadas, stock final −14 |
| Control (resta condicionada) | 0/10 | 3 aceptadas, stock final 1 |

- **Refinado:** cada transacción lee `currentStock = 10`, calcula 7 y lo escribe encima de
  la anterior (actualizaciones perdidas). El stock no llega a ser negativo, pero deja de
  cuadrar con los movimientos registrados: se registran 24 unidades de salida y solo se
  descuentan 3.
- **Básico:** mismo fallo que en la Fase 4B (allí 6 de 8 aceptadas y stock −8 por HTTP;
  aquí más, porque las llamadas salen más a la vez).
- **Control:** correcto en todas las ejecuciones, lo que valida la prueba.

Salidas completas: `docs/prueba_concurrencia/race_output.txt` y `control_output.txt`.

## Conclusión

La condición de carrera **no** está corregida en el módulo refinado. El modelo cumplió la
regla del prompt al pie de la letra, pero la regla era insuficiente: pedía una transacción,
y hacía falta una actualización condicionada (o `SELECT ... FOR UPDATE`, o aislamiento
`SERIALIZABLE`). S3 es la única vulnerabilidad de severidad alta que el refinado no
elimina pese a tener una regla para ella. La otra que sigue en los módulos refinados, S8
en productos (ya solo para ADMIN), no la cubría ninguna regla
(`docs/vulnerabilidades_pentesting.md`).

## Cómo repetirla

```bash
docker run --name racetest -e POSTGRES_USER=race -e POSTGRES_PASSWORD=race \
  -e POSTGRES_DB=racetest -p 5439:5432 -d postgres:16
export DATABASE_URL="postgresql://race:race@localhost:5439/racetest?connection_limit=10"
npx prisma db push
node docs/prueba_concurrencia/race.cjs
node docs/prueba_concurrencia/control.cjs
```
