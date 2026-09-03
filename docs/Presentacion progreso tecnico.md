# Presentación — Progreso Técnico (últimas 6 semanas)

**Formato:** una diapositiva por sección. Cada diapositiva tiene: título (H2), viñetas para el cuerpo, y notas del expositor en bloque `>` que puedes copiar al panel "Notas del orador" en Google Slides.

**Cómo usar:** para cada diapositiva, copia el título como el título de la diapositiva en Google Slides, las viñetas como texto principal, y el contenido del bloque `>` al panel de notas del orador.

---

## Diapositiva 1 — Progreso Técnico · Ecosistema PXO

- Reporte de avance
- Periodo: mayo – junio 2026
- CTO: Adrian Clarich

> Presentación dirigida a inversionistas y stakeholders. Objetivo: comunicar el progreso técnico de las últimas seis semanas, las decisiones estratégicas tomadas, y el camino restante hacia el lanzamiento suave y el lanzamiento oficial.

---

## Diapositiva 2 — Punto de partida

- Traspaso del equipo anterior sin documentación consolidada
- Sin visibilidad clara de wallets, reservas, o dependencias de configuración
- Backlog inexistente; expectativas no alineadas entre equipo técnico y dirección
- **Objetivo asumido:** pasar de "parchar y avanzar" a "estabilizar antes de escalar"

> La primera decisión no fue técnica sino de proceso. En lugar de continuar apilando funcionalidad sobre bases desconocidas, invertimos el primer mes en levantar la fotografía real del sistema: qué existe, qué funciona, qué está roto, y qué se creía documentado pero no lo estaba. Esto informó todo lo demás.

---

## Diapositiva 3 — Hallazgos críticos

- Flujo de redención (SELL) en Polygon mainnet **no funcionaba** por variable de entorno ausente
- Dirección hardcoded en frontend recibiendo redenciones — dueño **desconocido**
- Documento técnico del contrato describía **arquitectura distinta** a la realmente desplegada
- Panel administrativo **ciego a USDT** en tesorería a pesar de aceptarlo como pago

> Estos cuatro hallazgos son la razón por la que "avanzar rápido" habría sido peligroso. Ninguno era visible desde el uso diario del sistema. Los cuatro tienen plan de resolución en la próxima fase (nivel P0 en el backlog interno). Ninguno requiere refactorización estructural: son fallas de configuración y documentación, no de ingeniería.

---

## Diapositiva 4 — Mecánica del dinero (visión unificada)

- **Respaldo legal:** cuenta bancaria + instrumentos financieros (escrow)
- **Suministro:** 50M PXO pre-acuñados en reserva fría on-chain
- **Operación diaria:** tesorería caliente (float de trabajo)
- **Rieles fiat:** Bitso para redención (SPEI de salida)
- Diagrama completo en `docs/MONEY_MECHANICS.md`

> Uno de los entregables clave del periodo es la primera descripción integral, verificada contra código, de cómo se mueve el dinero en el sistema. Antes de esto, la mecánica dependía de conocimiento institucional no documentado. El diagrama permite que cualquier auditor, regulador o nuevo miembro del equipo comprenda el sistema en menos de veinte minutos.

---

## Diapositiva 5 — Decisión estratégica #1: Solo Polygon en esta fase

- Multi-cadena (Stellar, Tron, Solana) evaluada rigurosamente
- Costo operativo recurrente supera el beneficio pre-lanzamiento
- Cada cadena adicional agrega 0.5–1 día/semana de carga operativa permanente
- **Decisión:** enfoque en Polygon; reevaluación post-lanzamiento con datos de uso reales
- Memorando completo en `docs/MULTICHAIN_EXPANSION_DECISION.es.md`

> La expansión multi-cadena es una tentación permanente en cualquier proyecto de token porque parece "gratis" desde afuera. El análisis publicado muestra que el costo real está en operaciones recurrentes, no en ingeniería puntual. La disciplina de decir no ahora preserva la capacidad de decir sí más tarde con información concreta de demanda.

---

## Diapositiva 6 — Decisión estratégica #2: Salida de Conekta

- **Contexto:** modelo original contemplaba Conekta (tarjetas) como rampa fiat de entrada
- **Riesgo identificado:** chargebacks sobre pagos que ya se materializaron en PXO son irrecuperables
- **Combinación tóxica:** tarjeta reversible + transferencia on-chain irreversible = pérdida garantizada ante disputa fraudulenta
- **Nuevo modelo:** el usuario registra su CLABE SPEI como única fuente fiat autorizada
- Menor conveniencia inicial → mayor integridad estructural

> Esta decisión merece énfasis porque puede leerse como una reducción de alcance. En realidad es una mejora sustantiva del perfil de riesgo. Los procesadores de tarjeta operan bajo reglas donde el titular puede disputar cargos hasta 120 días después, y la resolución típicamente favorece al consumidor. Cuando el bien entregado es un token en cadena, la reversión es imposible. SPEI, al ser push-based, no tiene mecanismo de chargeback. El costo es exigir al usuario un vínculo bancario mexicano — barrera intencional que también funciona como capa KYC adicional.

---

## Diapositiva 7 — Contrato inteligente: corrección y transparencia

- Documento técnico previo describía USDC de Circle, no el contrato real
- Contrato real es una construcción híbrida: OpenZeppelin + patrón Tether legado
- **Cinco roles** distintos con poder soberano concentrado en el Propietario
- Nuevo documento técnico corregido, listo para revisión legal
- Preparación para publicación en repositorio dedicado (privado en F&F, público en lanzamiento oficial)

> Este es probablemente el hallazgo con mayor implicación regulatoria del periodo. Cualquier afirmación en materiales de marketing basada en la descripción anterior habría constituido una tergiversación material. La corrección permite que la comunicación externa sea defendible ante escrutinio de reguladores y consumidores. La estrategia de repositorio privado ante F&F y público al lanzamiento oficial equilibra transparencia con oportunidad de completar higiene operativa antes de exposición masiva.

---

## Diapositiva 8 — Producto: mejoras visibles

- Portal web rediseñado con estética minimalista tipo tether.to
- Gate de aceptación de Términos y Condiciones obligatorio antes de conectar wallet
- Panel de balance multi-token (PXO, USDT, USDC)
- Auditoría completa de variables de entorno documentada en `ENV_MATRIX.md`
- Arquitectura backend depurada de dependencias silenciosas

> Cambios visibles al usuario final refuerzan la percepción de un producto profesional. Cambios invisibles (higiene de configuración) previenen las incidencias más caras: aquellas que solo aparecen en producción. El gate de T&C, aparentemente cosmético, cumple el requisito de consentimiento explícito antes de vinculación a servicios financieros.

---

## Diapositiva 9 — Entregables documentales del periodo

- `ENV_MATRIX.md` — inventario de configuración por servicio
- `MONEY_MECHANICS.md` — mecánica de dinero verificada contra código
- `BACKLOG.md` — priorización por niveles hacia lanzamiento
- `MULTICHAIN_EXPANSION_DECISION.es.md` — memorando de decisión con trade-offs
- `PXO - Resumen técnico (corregido).md` — descripción precisa del contrato
- `RESUMEN_EJECUTIVO_LANZAMIENTO.md` — hoja de ruta ejecutiva

> Cada uno de estos documentos existe porque su ausencia era un riesgo. Se producen como sistema de conocimiento durable, no como reportes efímeros. Cualquier persona que se sume al equipo (contratación, asesoría, auditor) puede llegar a comprensión operativa en horas, no semanas.

---

## Diapositiva 10 — Camino adelante

- **Lanzamiento suave (F&F):** ~1-2 semanas de trabajo enfocado, 8 tareas identificadas
- **Lanzamiento oficial:** 2-4 meses adicionales, condicionado a completar higiene operativa y compliance
- **Prioridad inmediata:** cerrar los dos P0 (variable de entorno, dirección hardcoded)
- **Fuera de alcance deliberado:** multi-cadena, PXO nativo en otras cadenas, redención automatizada SPEI

> El calendario propuesto es defensible ante escrutinio externo. Prioriza integridad sobre velocidad, transparencia sobre marketing, y decisiones documentadas sobre acumulación silenciosa de riesgo. Estamos abiertos a discutir cualquier aspecto del plan, especialmente donde inversionistas tengan visibilidad sobre aliados potenciales (asesores de compliance en fintech mexicana, firmas de auditoría de contratos inteligentes, contactos operativos con Bitso).
