# Resumen técnico — Contrato PXO Token (versión corregida)

**Fecha:** 2026-06-30
**Reemplaza a:** "PXO - Resumen técnico.md" (versión anterior contiene inexactitudes materiales — ver Anexo A al final de este documento).
**Fuente única de verdad:** `docs/contracts/pxo.sol` (código fuente del contrato desplegado).
**Audiencia:** Asesoría legal y stakeholders ejecutivos.

> Este documento describe el contrato inteligente PXO **tal como está desplegado actualmente**, sin interpolación ni referencia a otros proyectos. Cada afirmación es verificable directamente en el código fuente.

---

## 1. Identidad del contrato

| Atributo | Valor |
|---|---|
| Nombre del contrato | `PXOToken` |
| Estándar | ERC-20 |
| Lenguaje | Solidity ^0.8.0 |
| Patrón arquitectónico | Contrato único, **no actualizable mediante proxy** |
| Componentes base | OpenZeppelin: `ERC20`, `ERC20Burnable`, `Ownable`, `Pausable` |
| Mecanismo de actualización | Patrón legado tipo Tether — descrito en sección 9 |
| Red de despliegue | **Polygon mainnet** (cadena ID: 137) |
| Dirección del contrato | `0xd6f9c21A585E2D77b62Ec8C65ab9beC70e2b77d7` |
| Verificable públicamente | Sí — código fuente publicado en Polygonscan |
| Decimales | Configurables en el momento del despliegue (valor desplegado a confirmar contra blockchain) |

---

## 2. Suministro

- El suministro inicial se determinó en el momento del despliegue mediante el parámetro `_initialSupply` del constructor.
- Todo el suministro inicial se acuñó a la dirección designada como `initialOwner` al desplegar.
- El suministro **puede aumentar** mediante las funciones `mint` (acuñación a una dirección arbitraria) e `issue` (acuñación al saldo del propietario). Ver roles a continuación.
- El suministro **puede disminuir** mediante las funciones `burn` (auto-quema), `burnFrom` (quema con permiso), `redeem` (quema desde el saldo del propietario) y `destroyBlackFunds` (quema forzada — ver sección 7).
- **No existe un tope máximo de suministro codificado en el contrato.**

---

## 3. Arquitectura de roles

El contrato define **cinco roles** con privilegios distintos. Una sola cuenta puede ostentar múltiples roles.

| Rol | Atribuible por | Capacidades exclusivas |
|---|---|---|
| **Propietario (`Owner`)** | Solo el propietario actual (mediante `transferOwnership`) | Asignar/revocar todos los demás roles; pausar/despausar el contrato; deprecar el contrato; emitir (`issue`) y redimir (`redeem`) desde su propio saldo; **además, hereda todos los privilegios de los otros cuatro roles**. |
| **Acuñador (`Minter`)** | Solo el Propietario, mediante `addMinter` / `removeMinter` | Acuñar tokens (`mint`) a cualquier dirección, en cualquier cantidad, sin límite por acuñador. |
| **Quemador (`Burner`)** | Solo el Propietario, mediante `addBurner` / `removeBurner` | Ejecutar `burnFrom`: quemar tokens de cualquier cuenta que haya otorgado autorización (`approve`). |
| **Listanegrista (`Blacklister`)** | Solo el Propietario, mediante `addBlacklister` / `removeBlacklister` | Añadir y remover direcciones de la lista negra (individualmente o por lote); ejecutar `destroyBlackFunds` para quemar irreversiblemente el saldo de una dirección listada en negro. |
| **Establecedor de comisión (`FeeSetter`)** | Solo el Propietario, mediante `addFeeSetter` / `removeFeeSetter` | Modificar los parámetros de comisión de transferencia (`basisPointsRate` y `maximumFee`), dentro de los topes codificados (ver sección 8). |

**Punto crítico:** el rol de **Propietario es el rol soberano del contrato**. Cualquier acción que pueda realizar un Acuñador, Quemador, Listanegrista o FeeSetter, también puede realizarla el Propietario directamente. Adicionalmente, el Propietario es el único que puede modificar el conjunto de cuentas que ostentan los demás roles.

**Posibles direcciones del Propietario en el ciclo de vida:** la dirección del Propietario fue establecida en el constructor. Puede transferirse mediante `transferOwnership` (función heredada de `Ownable`) o renunciarse mediante `renounceOwnership` (lo que dejaría al contrato sin Propietario y, por tanto, sin capacidad de gestionar roles — acción irreversible).

---

## 4. Funcionalidades estándar ERC-20

El contrato implementa la interfaz ERC-20 completa: `transfer`, `transferFrom`, `approve`, `allowance`, `balanceOf`, `totalSupply`, `decimals`. Todos los traslados respetan el estado de pausa del contrato y la lista negra (con el alcance descrito en sección 7).

Adicionalmente, mediante la extensión `ERC20Burnable`, cualquier titular puede **quemar voluntariamente sus propios tokens** mediante la función `burn(uint256)`. Esta función no requiere ningún rol y reduce el suministro total.

**Lo que el contrato NO implementa:**
- **No** soporta el estándar EIP-2612 (`permit` con firma fuera de cadena) — todas las aprobaciones requieren una transacción on-chain.
- **No** soporta ERC-1271 (verificación de firmas de contratos inteligentes).
- **No** incluye una función de rescate de tokens ERC-20 enviados por error al contrato.

---

## 5. Acuñación

Existen **dos rutas distintas** para crear nuevos tokens:

| Función | Caller permitido | Destinatario | Restricciones |
|---|---|---|---|
| `mint(address to, uint256 amount)` | Cualquier Acuñador o el Propietario | Cualquier dirección | Bloqueado cuando el contrato está pausado. **No existe tope por acuñador.** |
| `issue(uint256 amount)` | Solo el Propietario | El saldo del Propietario | No bloqueado por la pausa. |

**Implicación importante:** un Acuñador autorizado puede crear cantidades ilimitadas de PXO en una sola llamada. La integridad del suministro depende enteramente del juicio del Propietario al designar Acuñadores. **No existe un mecanismo de aprobación multifirma, ni un tope por minter, ni un retraso temporal codificado en el contrato.** Cualquier control adicional debe implementarse fuera del contrato (por ejemplo, mediante el uso de una billetera multifirma como Propietario).

---

## 6. Quema

Tres rutas para reducir el suministro:

| Función | Caller permitido | Origen de los tokens quemados |
|---|---|---|
| `burn(uint256)` | Cualquier titular | Su propio saldo |
| `burnFrom(address account, uint256 amount)` | Quemador o Propietario | Cualquier cuenta que haya otorgado `approve` al caller |
| `redeem(uint256 amount)` | Solo el Propietario | El saldo del Propietario |

Las funciones `mint`, `issue`, `burnFrom` y `redeem` emiten los eventos `Issue` y `Redeem` que permiten rastrear los cambios de suministro en cadena.

---

## 7. Lista negra y destrucción de fondos

### Alcance de la lista negra

Una dirección incluida en la lista negra **no puede iniciar transferencias** (función `transfer`) ni ser el origen de transferencias delegadas (función `transferFrom`).

**Limitación de alcance, importante para divulgación:** la lista negra **NO impide que una dirección reciba tokens.** Es decir, una dirección listada en negro puede seguir recibiendo PXO de otras direcciones; lo que se impide es su capacidad de mover esos tokens. La verificación ocurre únicamente sobre el remitente (`msg.sender` en `transfer`, `from` en `transferFrom`), no sobre el destinatario.

La lista negra **tampoco** impide que se acuñen tokens hacia una dirección listada, ni que esos tokens sean quemados mediante `burnFrom` (siempre que exista autorización previa).

### Destrucción de fondos en lista negra

La función `destroyBlackFunds(address)`, ejecutable solo por un Listanegrista o el Propietario, **quema irreversiblemente la totalidad del saldo** de una dirección previamente incluida en la lista negra. Esta acción:

- Reduce el suministro total del token.
- Es **irreversible**: una vez quemados, los tokens no pueden recuperarse ni reembolsarse mediante el contrato.
- Emite el evento `DestroyedBlackFunds` con el monto destruido.

### Operación por lote

Existen variantes por lote (`addBlackListBatch`, `removeBlackListBatch`) para incluir o remover múltiples direcciones en una sola transacción.

---

## 8. Comisión de transferencia

El contrato incluye un mecanismo de comisión sobre cada transferencia, **actualmente inactivo** (valores en cero) pero presente en el código.

| Parámetro | Valor inicial | Tope codificado | Modificable por |
|---|---|---|---|
| `basisPointsRate` | 0 puntos base | Estrictamente menor a 20 puntos base (< 0.2%) | FeeSetter o Propietario |
| `maximumFee` | 0 | Estrictamente menor a 50 × 10^decimales (≈ 50 PXO) | FeeSetter o Propietario |

**Cálculo:** la comisión aplicada a una transferencia es `min(monto × basisPointsRate / 10000, maximumFee)`.

**Destino de la comisión:** el monto cobrado se transfiere automáticamente al **Propietario** del contrato.

**Implicación de divulgación:** aunque la comisión está deshabilitada hoy, la *capacidad* existe en el contrato. Cualquier transferencia futura puede sujetarse a una comisión de hasta 0.2% (con tope absoluto), sin intervención del usuario, mediante una sola transacción del FeeSetter.

---

## 9. Pausa de emergencia

El Propietario (y únicamente el Propietario) puede ejecutar `pause()` para detener todas las funciones de transferencia, acuñación y aprobación. La función `unpause()` restablece la operación.

Mientras el contrato está pausado:
- No se pueden ejecutar `transfer`, `transferFrom`, `approve`, `mint`, `burnFrom`.
- **Sí pueden ejecutarse:** `issue`, `redeem`, gestión de roles, gestión de lista negra, `destroyBlackFunds`. Estas funciones del Propietario no están sujetas al modificador `whenNotPaused`.

---

## 10. Mecanismo de actualización (estilo Tether legado)

El contrato **no utiliza el patrón proxy/implementación** típico de las stablecoins de Circle. En su lugar implementa el patrón de "deprecación" originario de Tether (USDT):

- El Propietario puede ejecutar `deprecate(address newAddress)` para marcar el contrato como obsoleto y registrar la dirección de un nuevo contrato.
- Una vez deprecado, las funciones `transfer`, `transferFrom`, `approve`, `balanceOf`, `totalSupply` y `allowance` **redirigen sus llamadas al nuevo contrato** mediante la interfaz `IUpgradedToken`.
- El contrato original sigue existiendo en cadena pero actúa como una capa de compatibilidad.

**Implicaciones operativas y de divulgación:**

- A diferencia de un upgrade por proxy, este patrón **requiere desplegar un contrato completamente nuevo**, con una nueva dirección, lo que implica que las integraciones de terceros (exchanges, billeteras) deberán actualizar sus referencias.
- La acción `deprecate` es **una sola vía**: no existe función para revertir la deprecación una vez declarada.
- Una vez deprecado, los nuevos saldos viven en el nuevo contrato; los titulares interactúan operativamente con la nueva dirección.

---

## 11. Eventos emitidos

Para fines de trazabilidad on-chain, el contrato emite los siguientes eventos:

| Evento | Disparado por |
|---|---|
| `Transfer` (ERC-20 estándar) | `transfer`, `transferFrom`, `mint`, `burnFrom`, `burn`, `issue`, `redeem` |
| `Approval` (ERC-20 estándar) | `approve` |
| `Issue(uint256 amount)` | `mint`, `issue` |
| `Redeem(uint256 amount)` | `burnFrom`, `redeem` |
| `AddedBlackList(address)` / `RemovedBlackList(address)` | Gestión de lista negra |
| `DestroyedBlackFunds(address, uint256)` | `destroyBlackFunds` |
| `Deprecate(address)` | `deprecate` |
| `Params(uint256, uint256)` | `setParams` (cambio de comisión) |
| `MinterAdded` / `MinterRemoved` / equivalentes para los otros roles | Gestión de roles |
| `Paused(address)` / `Unpaused(address)` | `pause` / `unpause` |

---

## 12. Estado de auditoría

> **Importante para la asesoría legal:** al momento de redacción de este documento, **no se ha podido confirmar que el contrato PXO haya sido auditado por una firma externa independiente**. Cualquier afirmación pública en el sentido de que "los contratos de PXO han sido auditados" debe sustanciarse con el informe correspondiente antes de su publicación.
>
> El código fuente del contrato es público y verificable independientemente en Polygonscan. Esto constituye **transparencia**, no equivale a una **auditoría formal**.
>
> Fraseo recomendado para materiales de marketing y divulgación, en ausencia de auditoría externa: *"El código fuente del contrato PXO se publica y es independientemente verificable en Polygonscan. No se ha realizado una auditoría formal por una firma externa especializada."*

---

## 13. Riesgos y consideraciones para divulgación

Resumen no exhaustivo de elementos que requieren divulgación clara al usuario final y a los reguladores:

1. **Acuñación sin tope.** El Propietario y cualquier Acuñador designado pueden crear cantidades ilimitadas de PXO. No hay límite codificado al suministro total.
2. **Destrucción de fondos.** El rol de Listanegrista puede destruir irreversiblemente el saldo de cualquier dirección incluida en la lista negra.
3. **Comisión latente.** Existe capacidad para aplicar una comisión de hasta 0.2% a cada transferencia, que se cobraría al Propietario. Hoy está en cero, pero puede activarse en cualquier momento mediante una sola transacción.
4. **Pausa total.** El Propietario puede detener toda actividad de transferencias en el contrato.
5. **Concentración de poderes en el Propietario.** El rol de Propietario es el rol soberano. La identidad y custodia de la dirección del Propietario es el factor más crítico para la seguridad operativa del token. **Pendiente de confirmación: si la dirección del Propietario es una billetera multifirma, una cuenta individual, o una billetera de custodia institucional.**
6. **Mecanismo de actualización no convencional.** La deprecación del contrato es irreversible y obliga a integradores a actualizar referencias.
7. **Alcance limitado de la lista negra.** Las direcciones listadas pueden seguir recibiendo tokens; únicamente se les impide enviarlos.

---

## Anexo A — Discrepancias respecto al documento anterior

El documento anterior ("PXO - Resumen técnico.md") presenta inexactitudes materiales que deben corregirse antes de cualquier uso externo. Las principales:

| Afirmación anterior | Realidad |
|---|---|
| "Bifurcación del repositorio de Circle" | No es un fork de Circle USDC. Es una construcción híbrida sobre OpenZeppelin + patrón legado de Tether. |
| "Disponible nativamente en Arbitrum y Ethereum" | Desplegado únicamente en Polygon mainnet. |
| "Contratos FiatTokenV2_2 y FiatTokenProxy" | Contrato único llamado `PXOToken`. No existe arquitectura proxy. |
| "Biblioteca SignatureChecker y verificación ECDSA/ERC1271" | No implementadas. |
| "MasterMinter controla cuánto puede acuñar cada minter" | No existe MasterMinter. No existe tope por acuñador. |
| "Rol de Pausa separado" | La pausa la controla el Propietario directamente. No hay rol independiente. |
| "Rol de Rescatador" | No existe función de rescate. |
| "Actualización por proxy" | Mecanismo de deprecación estilo Tether, no proxy. |
| "Blacklist impide transferencias hacia o desde una dirección" | Solo impide envíos. Las direcciones listadas pueden recibir. |
| "Los contratos de PXO han sido auditados" | No verificado. Requiere sustanciación documental antes de publicar.

Estos elementos no representan errores menores: cada uno cambia materialmente la descripción del producto que se ofrece al usuario.
