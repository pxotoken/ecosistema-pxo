# PXOToken (Polygon mainnet)

Contrato `PXOToken` en `pxo.sol`. Para operaciones típicas de emisión y retiro desde cuentas de usuarios se usan:

- **`mint(address to, uint256 amount)`**: acuña `amount` a la dirección `to`. Puede llamarla el **`owner`** o cualquier cuenta con rol **minter** (`addMinter` solo owner). Requiere contrato **no pausado**.
- **`burnFrom(address account, uint256 amount)`**: quema `amount` del balance de `account`. Puede llamarla el **`owner`** o una cuenta con rol **burner**. Antes, `account` debe haber hecho **`approve(direccionBurner, amount)`** (o un allowance mayor) al **burner** que firma la tx, porque internamente se consume allowance hacia `msg.sender`. Requiere contrato **no pausado**.

Los montos van en **unidades mínimas** del token. En este monorepo el cliente de pagos asume **6 decimales** para PXO (`PXO_DECIMALS` en `apps/pagos/src/config/env.ts`; `pxoDecimals` en `apps/api-pagos/src/config/chains.ts`).

Existen también **`issue` / `redeem`** (solo owner, mint/burn sobre el balance del owner); este documento se centra en **`mint` / `burnFrom`**.

---

## Variables de entorno en el monorepo

Mantén **la misma dirección de contrato** en todos los servicios y frontends que operen esa red.

### Dirección del token PXO

| Ámbito | Variable | Apps |
|--------|----------|------|
| Backend | `PXO_TOKEN_ADDRESS_MAINNET` | `api-pagos`, `api-wallet`, `api-exchange` |
| Backend | `PXO_TOKEN_ADDRESS_TESTNET` | mismas (Amoy `80002`) |
| Backend | `PXO_TOKEN_ADDRESS_BSC` | solo `api-pagos` (cadena `56`) |
| Frontend (Vite) | `VITE_PXO_TOKEN_ADDRESS_MAINNET` | `apps/pagos`, `apps/web` (hooks venta/intercambio) |
| Frontend | `VITE_PXO_TOKEN_ADDRESS_TESTNET` | `apps/pagos`, `apps/web` |
| Frontend | `VITE_PXO_TOKEN_ADDRESS_BSC` | `apps/pagos` |

Para operaciones manuales con `cast`, puedes reutilizar la misma fuente que el código:

```bash
# ejemplo: mainnet desde backend
export TOKEN_ADDRESS="${PXO_TOKEN_ADDRESS_MAINNET:?set PXO_TOKEN_ADDRESS_MAINNET}"
# o desde un .env de Vite cargado en shell
export TOKEN_ADDRESS="${VITE_PXO_TOKEN_ADDRESS_MAINNET:?set VITE_PXO_TOKEN_ADDRESS_MAINNET}"
```

### RPC Polygon mainnet

| Variable | Uso |
|----------|-----|
| `POLYGON_MAINNET_RPC_URL` | `api-pagos`: si está definida, se usa tal cual para Polygon mainnet (`chains.ts`). |
| `ALCHEMY_API_KEY` | `api-pagos`: si no hay `POLYGON_MAINNET_RPC_URL`, construye `https://polygon-mainnet.g.alchemy.com/v2/<key>`. También usada para Amoy. |
| `ALCHEMY_API_KEY` | `api-wallet`: historial on-chain (nombre distinto, mismo propósito de proveedor). |

Para `cast` / `forge` en mainnet:

```bash
export RPC_URL="${POLYGON_MAINNET_RPC_URL:-https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY:?}}"
```

### Cadena de pagos y “forzar” mainnet

| Variable | Uso |
|----------|-----|
| `PAYMENTS_CHAIN_ID` | `api-pagos` (por defecto `80002`). |
| `VITE_PAYMENTS_CHAIN_ID` | `apps/pagos` (QR, auth Thirdweb hacia esa cadena). |
| `FORCE_POLYGON_MAINNET` | `api-wallet`, `api-exchange` (priorizan Polygon mainnet cuando es `true`). |
| `VITE_FORCE_POLYGON_MAINNET` | `apps/web` (y lógica relacionada en hooks). |

### Tesorería / cobro por `transfer` (sin `mint`/`burnFrom` en servidor)

Las apps usan una dirección de recepción de PXO alineada con la red:

| Variable | Uso |
|----------|-----|
| `VITE_POLYGON_PXO_RECEIVER_ADDRESS` | `apps/web`, flujos que muestran destino de transferencia en Polygon mainnet. |
| `VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS` | `apps/web`, Amoy; también referenciado en `api-pagos/.env.example`. |
| `POLYGON_PXO_RECEIVER_ADDRESS` | `api-exchange` (`chains.ts`). |
| `POLYGON_AMOY_PXO_RECEIVER_ADDRESS` | `api-exchange` (Amoy). |

Tras un deploy nuevo del **token**, suele cambiar solo `PXO_*_TOKEN_*`; la tesorería (`*_RECEIVER_*`) solo cambia si rotas la wallet de cobro.

### Claves de wallet en backend (no siempre = minter/burner)

| Variable | Apps | Nota |
|----------|------|------|
| `WALLET_PRIVATE_KEY` / `WALLET_PRIVATE_KEY_ENCRYPTED` + `ENCRYPTER_PRIVATE_KEY` | `api-wallet`, `api-exchange`; cifrado preferido en `.env.example` | Uso operativo del producto (p. ej. tesorería / Thirdweb). |
| `WALLET_PRIVATE_KEY_ENCRYPTED` | `api-pagos/.env.example` | Según despliegue. |

La cuenta que firmes para `mint`/`burnFrom` debe tener rol on-chain (**owner**, **minter** o **burner**). Esa cuenta puede coincidir o no con las variables anteriores; no están acopladas en código.

---

## Requisitos operativos

- `TOKEN_ADDRESS`: misma lógica que `PXO_TOKEN_ADDRESS_MAINNET` / `VITE_PXO_TOKEN_ADDRESS_MAINNET` para Polygon **137**.
- Clave privada cuya dirección pública sea **owner**, **minter** o **burner** en ese contrato.
- MATIC para gas en Polygon PoS mainnet.
- `RPC_URL` alineado con `POLYGON_MAINNET_RPC_URL` o `ALCHEMY_API_KEY` como arriba.

---

## Usar `mint` y `burnFrom` con Foundry (`cast`)

Instala [Foundry](https://book.getfoundry.sh/getting-started/installation). Carga las variables del entorno donde ya tengas `PXO_TOKEN_ADDRESS_MAINNET`, `POLYGON_MAINNET_RPC_URL` y/o `ALCHEMY_API_KEY` (p. ej. `set -a && source apps/api-pagos/.env && set +a`). No subas claves al repositorio.

```bash
export PRIVATE_KEY="${WALLET_PRIVATE_KEY:?}"   # o la clave del minter/burner; debe coincidir con roles on-chain
export TOKEN_ADDRESS="${PXO_TOKEN_ADDRESS_MAINNET:?}"
export RPC_URL="${POLYGON_MAINNET_RPC_URL:-https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY:?}}"
```

**Mint** (`RECIPIENT`; `AMOUNT` en unidades mínimas, p. ej. 6 decimales):

```bash
cast send "$TOKEN_ADDRESS" \
  "mint(address,uint256)" "$RECIPIENT" "$AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

**BurnFrom** (`ACCOUNT` debe haber aprobado al burner que firma):

```bash
cast send "$TOKEN_ADDRESS" \
  "burnFrom(address,uint256)" "$ACCOUNT" "$AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Approve desde la wallet del usuario (`USER_PRIVATE_KEY`):

```bash
cast send "$TOKEN_ADDRESS" \
  "approve(address,uint256)" "$BURNER_ADDRESS" "$AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$USER_PRIVATE_KEY"
```

`BURNER_ADDRESS` es la dirección pública de `PRIVATE_KEY` si el servidor es el burner.

Comprueba roles (en el contrato: rol **1** = minter, **2** = burner):

```bash
cast call "$TOKEN_ADDRESS" "hasRole(address,uint8)(bool)" "$SERVER_ADDRESS" 1 --rpc-url "$RPC_URL"
cast call "$TOKEN_ADDRESS" "owner()(address)" --rpc-url "$RPC_URL"
```

---

## “Actualizar” el contrato

El bytecode en una dirección **no se puede cambiar**. Las opciones habituales son:

1. **Desplegar un contrato nuevo** y, si aplica, usar el flujo previsto en el token: el owner puede llamar **`deprecate(address newAddress)`** para marcar el token legado y delegar lecturas/transferencias al contrato nuevo. La interfaz **`IUpgradedToken`** define lo que el **contrato nuevo** debe exponer (`transferByLegacy`, `transferFromByLegacy`, `approveByLegacy`, `balanceOf`, `totalSupply`, `allowance`) para que el token deprecado en la dirección vieja reenvíe las operaciones ERC-20 a `newAddress`.
2. **Migración manual**: comunicar la nueva dirección, snapshots, airdrops, etc.

Tras un **nuevo deploy** (nueva dirección de token), actualiza al menos: `PXO_TOKEN_ADDRESS_MAINNET`, `VITE_PXO_TOKEN_ADDRESS_MAINNET`, y las copias equivalentes en cada `.env` / secreto de despliegue de `api-pagos`, `api-wallet`, `api-exchange`, `apps/pagos` y `apps/web`.

Si en el futuro se usa un **proxy transparente/UUPS**, la “actualización” sería cambiar la implementación del proxy; este directorio solo contiene el `.sol` estático.

---

## Desplegar un contrato nuevo en Polygon mainnet

Constructor: `_initialSupply`, `_name`, `_symbol`, `_decimals`, `initialOwner`.

```bash
forge create src/PXOToken.sol:PXOToken \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args INITIAL_SUPPLY NAME SYMBOL DECIMALS OWNER_ADDRESS
```

`INITIAL_SUPPLY` en unidades mínimas (coherente con `DECIMALS` y con `pxoDecimals` / `PXO_DECIMALS` del monorepo si usas 6). Verifica en [Polygonscan](https://polygonscan.com). Luego sincroniza las variables de la tabla **Dirección del token PXO**.

---

## Alternativa sin que el servidor firme `mint`/`burnFrom`

1. El usuario envía **`transfer(tesorería, monto)`** desde su wallet hacia la dirección configurada como recepción PXO (`VITE_POLYGON_PXO_RECEIVER_ADDRESS` en front, `POLYGON_PXO_RECEIVER_ADDRESS` en `api-exchange`, etc.).
2. El backend valida el pago (p. ej. `txHash` o un mensaje firmado off-chain) contra el RPC que ya uses (`POLYGON_MAINNET_RPC_URL` / Alchemy).

Ventajas: sin custodia de clave con rol minter/burner en el servidor para ese cobro. Este `PXOToken` no incluye **EIP-2612 permit** ni **EIP-3009**; no hay “pull” estándar solo con firma salvo extender el contrato o un relayer con lógica propia.

En resumen: **cobro = transferencia firmada por el usuario** hacia la tesorería alineada con env; el backend confirma on-chain sin llamar `mint`/`burnFrom`.

### ¿Puede el cliente enviar un `transfer` sin monto o una firma sin monto y que el servidor “añada” el monto?

**Transfer on-chain sin monto:** no en ERC-20 estándar. La función es `transfer(address to, uint256 amount)`; el `amount` forma parte del calldata y de lo que firma la wallet. No existe una tx válida de transferencia del token sin un valor explícito en cadena (lo que puede haber es UX de “enviar todo el saldo”, pero en la red el monto ya está fijado en el momento de firmar).

**Firma off-chain sin monto y el servidor rellena el monto:** con patrones habituales **no** es seguro ni compatible con verificación criptográfica estándar:

- En **EIP-2612 permit** el digest incluye `value`, `spender`, `deadline`, etc. Si el servidor cambiara el monto, la firma dejaría de corresponder al mensaje y **no verificaría**.
- Cualquier esquema donde el usuario firma “algo” y el servidor elige el monto después implicaría o bien **confianza ciega** (el usuario no estaría autorizando un monto concreto) o bien un **contrato a medida** que interprete esa autorización (p. ej. límites máximos, nonce por factura), fuera de este `PXOToken`.

**Patrón recomendado:** el backend devuelve el **monto** (y opcionalmente `paymentId` / cadena / destino); el cliente muestra esa cifra y el usuario firma una **única** transacción `transfer(tesorería, monto)` con ese valor. La prueba puede ser el `txHash` o una firma EIP-712 que **incluya** el mismo monto e identificador de pago para correlación off-chain (sin sustituir la transferencia en cadena).
