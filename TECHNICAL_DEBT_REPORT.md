# Reporte de Deuda Técnica y Componentes Pendientes

> Generado durante la migración del monolito `landingpxo` al monorepo `pxotoken`
> Fecha: 2026-04-16

---

## 1. Módulos No Implementados / Incompletos

### 1.1 Feature "Transfers" (Coming Soon)
- **Nombre Sugerido:** `TransferModule` / `useTransfer` hook + `TransferPage` component
- **Responsabilidad:** Permite a los usuarios enviar tokens PXO/stablecoins entre wallets desde el dashboard. La ruta existe (`/dashboard/transfers`) y el sidebar tiene el item, pero no hay componente asociado.
- **Ubicación Recomendada:** `apps/web/src/components/transfers/TransferPage.tsx` + `apps/web/src/hooks/useTransfer.ts`
- **Estado:** Ruta registrada en `config/routes.ts`, item en `Sidebar.tsx` (línea 20), pero sin implementación.

### 1.2 Módulo de Inversiones / Productos (Stub)
- **Nombre Sugerido:** `InvestmentService` (backend) + `ProductInvestmentFlow` (frontend)
- **Responsabilidad:** El `ProductDetailsModal` tiene un flujo de inversión con monto mínimo y botón "Invest", pero la acción es un `alert()` — no hay API de backend ni lógica de negocio real.
- **Ubicación Recomendada:** `apps/api/api/investments/` (nuevo endpoint) + `apps/web/src/hooks/useInvestment.ts`
- **Estado:** UI parcialmente construida, backend inexistente.

### 1.3 Soporte BSC/BNB Chain (Parcial)
- **Nombre Sugerido:** `BscChainAdapter`
- **Responsabilidad:** Existe configuración parcial para BNB Chain (chainId 56) en `WalletModal`, `WalletOverview`, `SendFundsModal`, `ViewAssetsModal` y `usePXOExchange`. Sin embargo, el backend solo soporta Polygon (137) y Amoy (80002). El gas-subsidy acepta chainId 56 pero no hay contratos PXO desplegados en BSC.
- **Ubicación Recomendada:** `packages/shared/src/consts/chains.ts` (config centralizada) + contratos BSC en `apps/api/lib/`
- **Estado:** Frontend preparado, backend incompleto. Requiere deploy de contrato PXO en BSC.

### 1.4 Redis/Rate Limiting (Opcional, Sin Implementar)
- **Nombre Sugerido:** `RateLimitMiddleware`
- **Responsabilidad:** El `env.example` tiene variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`, pero no se encontró uso activo de Redis en el código. El rate limiting del gas-subsidy usa lógica in-memory o DB.
- **Ubicación Recomendada:** `apps/api/lib/middleware/rateLimit.ts`
- **Estado:** Variables de entorno definidas, implementación ausente.

---

## 2. Código Legacy / Deshabilitado

### 2.1 Endpoints Binance Directos (Deshabilitados)
- **Nombre Sugerido:** `BinanceDirectEndpoints` (legacy)
- **Responsabilidad:** 5 endpoints de API directa a Binance (`account`, `allOrders`, `order`, `ping`, `price`). Fueron reemplazados por `BinanceService.ts` centralizado.
- **Ubicación Actual:** `apps/api/_api-disabled/binance/`
- **Recomendación:** Eliminar una vez confirmada la estabilidad del `BinanceService`. No aportan valor al monorepo.

### 2.2 Endpoints de Test/Demo
- **Nombre Sugerido:** N/A — eliminar en producción
- **Responsabilidad:** `api/test.ts`, `api/test-supabase.js`, `api/pokeapi.ts` son endpoints de prueba que exponen información del entorno.
- **Ubicación Actual:** `apps/api/api/test.ts`, `api/test-supabase.js`, `api/pokeapi.ts`
- **Recomendación:** Remover antes de pasar a producción o proteger con `withAdminAuth`.

---

## 3. Inconsistencias de Código

### 3.1 Mezcla JS/TS en Backend
- **Responsabilidad:** El API tiene 20 archivos `.js` y 8 archivos `.ts`. La lib tiene 20 `.js` y 21 `.ts`. No hay consistencia en el lenguaje.
- **Ubicación:** `apps/api/api/` y `apps/api/lib/`
- **Recomendación:** Migrar progresivamente todos los `.js` a `.ts` para aprovechar type safety. Priorizar: `authMiddleware.js`, `authUtils.js`, `supabase.js`, `UserRepository.js`, `UserService.js`.

### 3.2 Toast Duplicado
- **Nombre Sugerido:** Unificar en `@pxo/web` UI
- **Responsabilidad:** Existen dos implementaciones de Toast: `components/ui/Toast.tsx` (con provider) y `components/common/Toast.tsx` (versión vieja).
- **Ubicación:** `apps/web/src/components/ui/Toast.tsx` y `apps/web/src/components/common/Toast.tsx`
- **Recomendación:** Eliminar `common/Toast.tsx` y usar exclusivamente `ui/Toast.tsx`.

### 3.3 Console.logs en Producción
- **Responsabilidad:** `ProductDetailsModal.tsx` tiene `console.log` de debug activos. `thirdwebServer.js` también logguea payloads completos.
- **Recomendación:** Eliminar o condicionar con `NODE_ENV`.

---

## 4. Seguridad — Endpoints Sin Autenticación

### 4.1 Endpoints KYC Sin Auth
- **Nombre Sugerido:** `KycAuthMiddleware`
- **Responsabilidad:** `api/kyc/requests` (GET) y `api/kyc/update-status` (PUT) no tienen middleware de autenticación. El update-status debería requerir `withAdminAuth`.
- **Ubicación:** `apps/api/api/kyc/`
- **Recomendación:** Agregar `withAdminAuth` a ambos endpoints.

### 4.2 Endpoint Users Sin Auth
- **Responsabilidad:** `api/users/index.js` permite GET/POST/PUT sin autenticación. Crear/actualizar usuarios debería requerir auth.
- **Ubicación:** `apps/api/api/users/index.js`

### 4.3 Email Broadcast Sin Auth Admin
- **Responsabilidad:** `api/email/broadcast.ts` puede enviar emails masivos sin verificación de admin. Tiene `authenticateRequest` pero no `withAdminAuth`.
- **Ubicación:** `apps/api/api/email/broadcast.ts`

---

## 5. Refactorizaciones Recomendadas

### 5.1 Centralizar Configuración de Chains
- **Nombre Sugerido:** `ChainConfig` en `@pxo/shared`
- **Responsabilidad:** Las direcciones de contratos, chain IDs y RPC URLs están hardcodeadas en múltiples archivos (`useWalletStore.ts`, `sendPXOToUser.js`, `sendStablecoinToUser.js`, `liquidity.js`).
- **Ubicación Recomendada:** `packages/shared/src/consts/chains.ts`

### 5.2 HTTP Client Frontend
- **Nombre Sugerido:** `ApiClient`
- **Responsabilidad:** Cada hook frontend hace `fetch()` directamente con manejo de errores repetido. Falta un wrapper centralizado.
- **Ubicación Recomendada:** `apps/web/src/lib/apiClient.ts`

### 5.3 UserProfile Datos Hardcodeados
- **Responsabilidad:** `UserProfile.tsx` (línea 15) tiene `legal_identification: 'ABC123456'` hardcodeado como fallback.
- **Ubicación:** `apps/web/src/components/UserProfile.tsx`

### 5.4 Falta Suite de Tests
- **Responsabilidad:** No existen tests unitarios, de integración ni e2e en todo el proyecto. Zero test files encontrados.
- **Recomendación:** Agregar Vitest para unit tests en `packages/shared` y `apps/web`, y tests de API con supertest en `apps/api`.

---

## 6. Resumen de Acciones Prioritarias

| Prioridad | Acción | Impacto |
|-----------|--------|---------|
| **ALTA** | Agregar auth a endpoints KYC y Users | Seguridad |
| **ALTA** | Proteger broadcast email con admin auth | Seguridad |
| **MEDIA** | Migrar archivos .js → .ts en backend | Mantenibilidad |
| **MEDIA** | Centralizar chain config en shared | Reducir duplicación |
| **MEDIA** | Crear API client centralizado en web | Reducir código repetido |
| **MEDIA** | Implementar feature Transfers | Funcionalidad faltante |
| **BAJA** | Eliminar _api-disabled y test endpoints | Limpieza |
| **BAJA** | Eliminar Toast duplicado | Limpieza |
| **BAJA** | Agregar test suite | Calidad |
