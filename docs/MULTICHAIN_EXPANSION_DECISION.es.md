# Memorándum de Decisión: Expansión de Rampas de Entrada (Pay-In) Multi-Chain

**Estado:** Propuesto — se solicita decisión direccional
**Fecha:** 2026-06-23
**Autor:** Ingeniería / Arquitectura
**Partes interesadas:** Fundadores, Inversionistas, Producto, Cumplimiento
**Decisión requerida antes del:** 30 días post-lanzamiento (2026-08-01)
**Decisión solicitada:** Aprobar la secuencia para evaluación post-lanzamiento. No se solicita compromiso de recursos el día de hoy.

---

## Resumen ejecutivo

Tres cadenas candidatas para expansión de rampas de entrada: **Stellar, Tron, Solana**. Las tres requieren 3-5 semanas de ingeniería. El costo de construcción es la parte barata — la operación recurrente cuesta 0.5-1 día/semana por cadena, para siempre.

**Camino recomendado:** secuencia Stellar → Tron → Solana. No paralelizar. No iniciar antes de 30 días post-lanzamiento. **La primera acción es una llamada con Bitso** — podría colapsar este memorándum entero en un simple cambio de configuración.

---

## Contexto

Anteriormente en esta fase, el enfoque multi-chain fue desestimado deliberadamente: solo Polygon, BSC diferido. Esa decisión está reflejada de extremo a extremo en el código (sistema de tipos, rutas, mapas de contratos, imports del SDK — verificado el 2026-06-23). La aplicación acepta USDT/USDC únicamente en Polygon.

Las preguntas de stakeholders están emergiendo: *"¿Pueden los usuarios comprar PXO con USDT de Tron / USDC de Solana / USDC de Stellar?"* La respuesta hoy es no. Este memorándum proporciona el menú para que la respuesta pueda convertirse en "aquí están las opciones, costos y trade-offs" en lugar de "depende."

Este memorándum propone un camino. No propone comprometerse con él antes del lanzamiento.

---

## Alcance

**Dentro del alcance de este memorándum:** Rampas de entrada (pay-in) desde cadenas no-EVM usando un **patrón de swap custodiado** — el usuario envía stablecoin a tu tesorería en esa cadena, el backend detecta, el backend transfiere PXO de Polygon a la wallet Polygon del usuario. PXO en sí permanece nativo de Polygon.

**Explícitamente fuera de alcance:**
- Emitir PXO nativamente en otras cadenas (tokenomics multi-supply — épica separada, mucho más grande)
- Redención / salida hacia cadenas no-EVM (condicionada por la estrategia de redención)
- BSC (decisión previa separada)
- Puentes (bridges) en vivo (Allbridge/Wormhole) como flujos de usuario final (idea para Fase 2, no ahora)

---

## Opciones comparadas

### Esfuerzo de ingeniería (patrón de swap custodiado)

| Dimensión | **Stellar** | **Tron** | **Solana** |
|---|---|---|---|
| Madurez del SDK | `@stellar/stellar-sdk` — maduro, limpio | `tronweb` — maduro, DX más áspera | `@solana/web3.js` — maduro, gran comunidad |
| Elección de activo | USDC nativo (Circle) ✅ | **Solo USDT** — Circle dejó de emitir USDC en Tron en 2024 | USDC nativo (Circle) ✅ |
| Matching de payment intent | Memo nativo de 32 bytes ✅ | **Sin memo nativo en TRC20** — requiere direcciones de depósito por intent derivadas vía HD | Memo Program (instrucción adicional) ✅ |
| Fricción del modelo de cuenta | Trustline (una vez por activo) | Directo, similar a EVM | Token accounts (ATA) — ~$0.02 SOL de renta para usuarios nuevos |
| Infraestructura RPC | Horizon (tier gratuito escala) | TronGrid tier gratuito alcanza | **RPC pago esencialmente obligatorio** (Helius/Triton/QuickNode, $50-500/mes) |
| Modelo de recursos/gas | Comisión por tx en XLM (~$0.0001) | Sistema de energy/bandwidth — mantener balance de TRX | Comisión por tx en SOL + renta ATA |
| **Estimación de construcción** | **3-4 semanas** | **4-5 semanas** | **3-4 semanas** |

### Dimensiones operacionales / estratégicas (recurrentes, no únicas)

| Dimensión | **Stellar** | **Tron** | **Solana** |
|---|---|---|---|
| Reputación de cumplimiento | Orientado a pagos, limpio | **USDT-TRC20 carga escrutinio AML/sanciones** — bancos y algunos exchanges lo marcan | Limpio, stablecoin amigable con EE.UU. |
| Fit en LATAM | Base de usuarios menor, nativos de pagos | **Mayor red de remesas USDT en LATAM** — fuerte fit para México | DeFi/retail fuerte, menos enfoque en remesas |
| Rutas de rebalance de tesorería | Allbridge, swaps en CEX (Kraken) — liquidez moderada | Muchos CEX (Binance prime), Wormhole — mejor liquidez USDT global | Wormhole, deBridge, Allbridge — ecosistema de puentes más fuerte |
| Multisig / seguridad de tesorería | Multisig nativo (limpio) | Multisig vía contrato o custodia de exchange | Squads protocol (maduro) |
| Historial de uptime de la red | Excelente | Excelente | **Múltiples caídas de varias horas en 2022-2023** (mejorado desde) |
| ¿Bitso (custodio actual) soporta? | **Por verificar — debe confirmarse** | **Por verificar — debe confirmarse** | **Por verificar — debe confirmarse** |

### Modelo de costo marginal

- **Primera cadena: 3-4 semanas de ingeniería**, incluye construir una abstracción reusable de chain-adapter (~30% de impuesto inicial).
- **Cada cadena subsecuente: 2-3 semanas** si la abstracción existe. Sin ella: 3-4 semanas por cadena, independientemente, más deuda técnica acumulada.
- **Operación recurrente: 0.5-1 día/semana por cadena, a perpetuidad** — monitoreo de tesorería, ejecución de rebalance, alertas, soporte a envíos erróneos, atestación de cumplimiento.

Tres cadenas en vivo → **1.5-3 días/semana de carga operacional perpetua**. La ingeniería es costo único; la operación es costo permanente. Esta es la línea que debe guiar la decisión, no "¿está listo el SDK?".

---

## Recomendación

### Secuencia: Stellar → Tron → Solana. Lanzar → medir → decidir.

#### Por qué este orden

1. **Stellar primero** — la tecnología más limpia, arquitectura nativa de pagos, sin carga reputacional de cumplimiento. La base de usuarios más pequeña pero también la superficie de riesgo más pequeña. El lugar correcto para construir la abstracción de chain-adapter que abarata (2) y (3).
2. **Tron segundo** — mayor volumen de remesas USDT en LATAM = mayor impacto de usuario para el mercado mexicano. Vale la pena el workaround de memo y la restricción de solo-USDT, *si* cumplimiento aprueba.
3. **Solana tercero** — solo si la data muestra demanda. Tecnología fuerte pero el fit de remesas en LATAM es más débil que el de Tron.

#### Por qué secuencia, no paralelo

- Cada cadena lanzada revela uso real, costo real de tesorería, fricción real de cumplimiento.
- Paralelizar triplica el riesgo de tesorería y la carga operacional *antes* de conocer el product-market fit.
- Eficiencia de capital del inversionista: una cadena en producción enseña más que tres a medio construir.

#### Precondiciones (no iniciar sin)

- Lanzamiento estable post-2026-07-01 y compuerta de inversionistas despejada.
- **Confirmación de Bitso por cadena** — podrían ya custodiar una o más de estas, lo que colapsaría la cuestión de tesorería en un cambio de configuración. Esta sola llamada podría replantear todo el memorándum. Hacerlo primero.
- Aprobación de cumplimiento/legal por cadena, especialmente **Tron** (reputación AML/sanciones de USDT-TRC20).

#### Inversión estimada

| Fase | Ventana | Ingeniería | Onboarding operacional |
|---|---|---|---|
| Stellar | Mes 1-2 post-lanzamiento | 3-4 semanas (1 ingeniero) + ~30% impuesto de abstracción | ~1 semana de tesorería + dashboards |
| Tron | Mes 3-4 post-lanzamiento | 2-3 semanas (1 ingeniero) si Stellar fue lanzado | ~1 semana |
| Solana | Mes 5+, condicionado por data | 2-3 semanas (1 ingeniero) si previas fueron lanzadas | ~1 semana |

---

## Registro de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Compromiso de llave de tesorería (por cadena) | Baja | Catastrófico | Patrón de llave encriptada; multisig nativo donde se soporte |
| Bitso no custodia la cadena objetivo | Media | Aumenta significativamente el alcance de operaciones de tesorería | **Verificar antes de comprometer** |
| Cumplimiento bloquea Tron específicamente (reputación de USDT-TRC20) | Media | El camino Tron deja de ser viable | Revisión legal pre-ingeniería |
| Carga operacional subestimada; burnout del equipo | Media | Erosión de calidad/confiabilidad | Contratar capacidad de operaciones antes de la cadena #2 |
| Caída de red (Solana especialmente) | Baja/Media | Retrasos en liquidación | TTL en payment intent + SOP de reconciliación manual |
| Depósitos de usuario en activo/cadena equivocados | Media | Carga operacional de reembolsos | Guardas fuertes en frontend + SOP de reembolso documentado |
| Brecha de liquidez en ruta de rebalance | Media | Pausa temporal de pay-in en cadena afectada | Carriles de rebalance pre-establecidos + switch de pausa por cadena |

---

## Preguntas abiertas para stakeholders

1. **Cobertura de custodia de Bitso por cadena** — las respuestas podrían colapsar este memorándum entero. *Dueño: Fundadores. Recomendado lo antes posible, incluso pre-lanzamiento.*
2. **Postura de reporte ante CNBV/SAT** sobre rampas de entrada no-EVM. *Dueño: Cumplimiento.*
3. **Posición de cumplimiento específica para Tron** — ¿la reputación AML/sanciones de USDT-TRC20 entra en conflicto con el posicionamiento regulatorio de la marca? *Dueño: Cumplimiento + Fundadores.*
4. **Señal de demanda** — ¿hay un inversionista, partner o segmento de usuario específico pidiendo alguna de estas, o es expansión de alcance hipotética? *Dueño: Producto.* (Determina si iniciar la Fase 1 del todo.)

---

## Lo que explícitamente NO estamos proponiendo

- Emitir PXO nativamente en Stellar/Tron/Solana
- Redención / salida hacia esas cadenas
- Expansión a BSC (decisión previa separada)
- Puentes en vivo como flujos de usuario final
- Iniciar cualquiera de esto antes de que se estabilice el lanzamiento del 2026-07-01

---

## Decisión solicitada

**De los stakeholders:** Aprobar la *opción* de perseguir la Fase 1 (Stellar) post-lanzamiento, condicionada a:
- Confirmación de custodia con Bitso
- Aprobación de cumplimiento
- Lanzamiento estable + compuerta de inversionistas despejada

Este memorándum solicita **alineación direccional**, no compromiso de recursos. El "go / no-go" para trabajo de ingeniería ocurre en un segundo punto de decisión, después de la conversación con Bitso y la revisión de cumplimiento.

**De ingeniería:** No se requiere acción hasta decisión direccional.

---

## Apéndice A — Por qué swap custodiado y no puente en vivo

| | Swap custodiado (propuesto) | Puente en vivo (Allbridge/Wormhole) |
|---|---|---|
| UX del usuario | Una firma, una dirección | Dos firmas, espera 10-30 min, comisiones de puente + slippage |
| Nuevo riesgo de custodia | Sí — sostienes tesorerías en N cadenas | No — los fondos transitan, nunca custodiados por ti |
| Tiempo de construcción | 3-5 semanas por cadena | 4-6 semanas (orquestación frontend + integración de puente + manejo de fallos) |
| Costo operacional recurrente | Rebalance de tesorería | Monitoreo de puentes, soporte a usuarios con puentes atorados |
| Mejor para | UX predecible, flujos más simples | Arquitecturas custody-averse |

El swap custodiado se recomienda para Fase 1 porque el equipo ya opera una tesorería de Polygon — el patrón operacional es conocido. El puente en vivo es una consideración de Fase 2 solo si las operaciones de tesorería se vuelven insostenibles.

---

## Apéndice B — Por qué Stellar primero (vs. el mayor footprint de Tron en LATAM)

Tron tiene objetivamente mayor volumen de USDT en LATAM que Stellar. Poner Stellar primero no es negar eso — es una decisión de secuencia:

- Stellar no carga fricción de cumplimiento; puede lanzarse sin esperar revisión legal.
- El soporte nativo de memo en Stellar permite diseñar la abstracción de chain-adapter contra un caso de referencia limpio primero, y luego extenderla para manejar el workaround de memo en Tron.
- Un piloto con Stellar enseña al equipo el patrón operacional (tesorería, rebalance, alertas) con menor riesgo regulatorio.
- Tron primero significa que la primera integración es también la más probable de ser bloqueada o retrasada por cumplimiento — alto riesgo de calendario.

Si cumplimiento pre-aprueba Tron rápidamente, la secuencia está abierta a revisión.
