# Resumen Ejecutivo — Hoja de Ruta al Lanzamiento

**Fecha:** 2026-06-25
**Audiencia:** CEO y stakeholders ejecutivos
**Detalle técnico:** ver [BACKLOG.md](./BACKLOG.md), [MONEY_MECHANICS.md](./MONEY_MECHANICS.md)

---

## Posición actual

- La aplicación es **funcional para uso interno** con ~100 PXO circulando entre inversionistas en pruebas.
- Las rampas de entrada (BUY) operan: usuarios pueden comprar PXO con USDT/USDC en Polygon, o con MXN vía Conekta.
- La operación está concentrada: tesorería caliente, custodia fría, reserva escrow y rieles fiat funcionando bajo coordinación manual.
- **Cadena soportada hoy: Polygon únicamente.** Multi-cadena es una decisión separada y diferida.

---

## Lanzamiento suave (F&F — *friends and family*, círculo cerrado de familia, amigos e inversionistas) — alcanzable en 1-2 semanas

Lo que se necesita para abrir el círculo F&F con seguridad:

**Bloqueadores críticos (P0 — prioridad máxima, deben resolverse antes de cualquier otra cosa):**
1. La redención de PXO en Polygon mainnet no funciona hoy por una variable de entorno faltante. Solución conocida; ejecución de 15 minutos una vez identificada la dirección correcta.
2. El frontend contiene una dirección de wallet codificada cuyo dueño no está confirmado. Requiere verificación en cadena para descartar fondos huérfanos.

**Higiene operativa (P1 — alta prioridad, sin estos el lanzamiento es frágil):**
3. Conciliación de variables de entorno entre código y Railway (todos los servicios).
4. Visibilidad de USDT en el panel administrativo (hoy solo se ve PXO y USDC).
5. Documentación formal de las wallets (TREASURY.md) — para que cualquier auditor o inversionista pueda obtener respuestas sin recurrir a memoria institucional.
6. Prueba end-to-end de compra y venta en mainnet con wallet controlado.
7. Comunicación clara a testers: qué funciona, qué es manual, qué está fuera de alcance.

**Esfuerzo total estimado:** ~15-20 horas de trabajo enfocado, distribuidas en 1-2 semanas calendario.

---

## Lanzamiento oficial — 2-4 meses adicionales

Requiere completar el lanzamiento suave y luego abordar:

- **Reconciliación y prueba de reservas** — vista pública o atestación periódica que demuestre que los PXO emitidos están respaldados por el escrow.
- **Custodia multifirma** de la reserva fría (si aún no lo es) — requisito típico de auditoría.
- **Persistencia en backend** de aceptación de Términos y Condiciones — hoy solo se guarda en el navegador.
- **Visibilidad de saldos Bitso** desde el panel administrativo — hoy se confía en el dashboard de Bitso.
- **Revisión y endurecimiento del flujo KYC** bajo condiciones reales.
- **Limpieza técnica** acumulada del traspaso del equipo anterior (consolidación de variables, eliminación de código legacy).

El alcance final dependerá del nivel de automatización y rigor de cumplimiento deseado. La estimación de 2-4 meses asume el equipo actual (CTO con asistencia de IA), no contrataciones adicionales.

---

## Decisiones explícitamente diferidas

Estas se mencionan en conversaciones recurrentes. **No están en pausa por descuido; están fuera de alcance por decisión deliberada.**

| Tema | Razón | Memorando relacionado |
|---|---|---|
| Expansión a Stellar / Tron / Solana | Costo operativo recurrente alto; sin demanda confirmada; evaluar post-lanzamiento | [MULTICHAIN_EXPANSION_DECISION.es.md](./MULTICHAIN_EXPANSION_DECISION.es.md) |
| PXO nativo en otras cadenas | Duplica tokenomics, tesorería y superficie de auditoría | Mismo |
| Expansión a BSC | Decisión previa de fase | Memoria del proyecto |
| Mint-on-deposit | Requiere investigación tokenómica + decisión regulatoria primero | Diferido a post-lanzamiento |
| Redención automatizada SPEI | Decisión de alcance previa: pago a comerciantes es prioridad, redención fiat al usuario es manual | Memoria del proyecto |

---

## Realismo sobre el estado actual

- El traspaso del equipo anterior dejó vacíos de documentación significativos. Los hemos identificado y los estamos cerrando ordenadamente.
- La mayoría de los problemas pendientes son de **configuración y documentación**, no de ingeniería compleja. Esto es positivo: significa que el código base subyacente es viable.
- Operamos hoy con prácticas manuales (refills de tesorería, conciliación MXN ↔ escrow). Esto es aceptable para volumen de pruebas; es un riesgo a escala que se aborda en fase post-lanzamiento.
- La estrategia de "parchar y avanzar" ha sido reemplazada por "estabilizar antes de escalar". Esto requiere conversaciones difíciles a corto plazo a cambio de menos sorpresas a mediano plazo.

---

## Decisión solicitada

Confirmar alineación sobre:

1. **Lanzamiento oficial 2026-07-01 se reemplaza por un lanzamiento suave a F&F en ventana similar**, seguido de lanzamiento oficial 2-4 meses después condicionado a completar la Fase 2.
2. **Multi-cadena permanece fuera de alcance** hasta que el lanzamiento se estabilice y existan señales de demanda concretas.
3. **Los dos P0 identificados se ejecutan esta semana** como prioridad absoluta antes de cualquier otra actividad de producto.

Una vez confirmados estos tres puntos, el backlog detallado (~30 ítems clasificados) está listo para ejecución en el orden propuesto.

---

## Glosario rápido

| Término | Significado |
|---|---|
| **F&F** | *Friends and family.* Círculo cerrado de personas de confianza (familia, amigos, inversionistas iniciales) que prueban el producto antes del lanzamiento público. |
| **P0 / P1** | Niveles de prioridad. **P0** = bloqueador crítico que debe resolverse antes que cualquier otra cosa. **P1** = alta prioridad, sin él el lanzamiento es frágil pero no imposible. |
| **Lanzamiento suave** *(soft launch)* | Apertura controlada a un grupo limitado de usuarios reales antes del lanzamiento abierto al público. Permite detectar problemas con bajo costo reputacional. |
| **Lanzamiento oficial** | Apertura pública con comunicación de marketing, sin restricción de quién puede usar la plataforma. |
| **Mainnet** | Red blockchain de producción (donde se mueve dinero real), en contraste con *testnet* (red de pruebas con tokens sin valor). Nuestra mainnet hoy es Polygon. |
| **BUY / SELL** | Compra y venta de PXO desde la perspectiva del usuario. *BUY* = usuario entrega USDT/USDC o MXN y recibe PXO. *SELL* = usuario entrega PXO y recibe USDT/USDC o MXN. |
| **Variable de entorno** | Configuración del sistema definida fuera del código (típicamente en el panel de Railway o Vercel). Si falta o está mal puesta, partes del sistema dejan de funcionar silenciosamente. |
| **Tesorería caliente** *(hot wallet)* | Wallet en línea que firma transacciones automáticamente. Tiene el menor saldo posible para limitar exposición. |
| **Reserva fría** *(cold storage)* | Wallet desconectada de internet que guarda la mayor parte del suministro de PXO. Solo se usa para reabastecer la tesorería caliente, con intervención humana. |
| **Multifirma** *(multisig)* | Mecanismo de seguridad donde una transacción requiere la aprobación de varias llaves privadas (no solo una). Reduce el riesgo de compromiso de una sola persona. |
| **Escrow** | Cuenta o instrumento donde se depositan activos como garantía de respaldo. En nuestro caso: cuenta bancaria + instrumentos financieros que respaldan el peg PXO ↔ MXN. |
| **Mint-on-deposit** | Modelo en el que se emiten nuevos PXO automáticamente cuando llegan fondos al escrow. Hoy no existe; los 50M PXO ya están emitidos y se mueven desde la reserva fría manualmente. |
| **KYC** | *Know Your Customer.* Proceso de verificación de identidad requerido por regulación. |
| **SPEI** | Sistema de Pagos Electrónicos Interbancarios de Banxico — el riel estándar para transferencias en MXN entre bancos mexicanos. |
