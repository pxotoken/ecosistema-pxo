# Ecosistema PXO

Ecosistema del Peso Digital Mexicano (**PXO**). Monorepo que incluye las apps de usuario, el checkout de pagos, y las **APIs de dominio** que se ofrecen como producto a terceros.

> **Principios rectores**
> - **APIs por dominio** — cada dominio de negocio se publica como una API independiente, con ownership y ciclo de vida propios.
> - **Orquestación** — cuando un caso de uso combina varios dominios, la composición vive en una capa de orquestación explícita, nunca escondida dentro de un dominio.
> - **APIs como activo** — además de las apps de usuario, las APIs son un producto comercializable para partners y merchants.

---

## Arquitectura de alto nivel

```mermaid
flowchart TB
    subgraph Clients["👥 Consumidores"]
        L[Landing<br/>marketing · público]
        W[Web App<br/>wallet · dashboard]
        P[Checkout Pagos<br/>merchants]
        E[Partners / Terceros<br/>API consumers]
    end

    subgraph Gateway["🌐 Capa de Orquestación"]
        GW[Orchestrator<br/>composición cross-domain<br/>auth · rate-limit · audit]
    end

    subgraph Domains["🧩 APIs por Dominio"]
        D1[Auth<br/>JWT · Thirdweb · sesiones]
        D2[Users & KYC<br/>perfiles · verificación]
        D3[Wallet<br/>firma · gas · custodia]
        D4[Payments<br/>checkout · pagos-api]
        D5[Exchange<br/>rates · FX]
        D6[Tokens<br/>PXO multi-chain]
        D7[Notifications<br/>email · push]
        D8[Admin & Ops<br/>cron · audit · panel]
    end

    subgraph Infra["☁️ Infraestructura"]
        I1[(Supabase<br/>Postgres · Storage)]
        I2[Thirdweb SDK]
        I3[Alchemy RPC<br/>Polygon · BSC]
        I4[Resend<br/>email]
        I5[Binance API<br/>prices]
        I6[(Upstash Redis<br/>rate-limit · cache)]
    end

    L --> GW
    W --> GW
    P --> GW
    E --> GW

    GW --> D1
    GW --> D2
    GW --> D3
    GW --> D4
    GW --> D5
    GW --> D6
    GW --> D7
    GW --> D8

    D1 -.-> I1
    D1 -.-> I2
    D2 -.-> I1
    D3 -.-> I2
    D3 -.-> I3
    D4 -.-> I1
    D4 -.-> I6
    D5 -.-> I5
    D6 -.-> I3
    D7 -.-> I4
    D8 -.-> I1
```

**Flujo de lectura:** consumidor → orquestador → 1..N dominios → infraestructura. Cada dominio se puede versionar, escalar y vender de forma independiente; la orquestación es la que "conoce" el caso de uso de negocio.

---

## APIs por Dominio

| Dominio | Responsabilidad | Consumible como producto |
|---------|-----------------|--------------------------|
| **Auth** | Login con wallet (Thirdweb) · emisión/verificación JWT · sesiones | ✅ |
| **Users & KYC** | Perfil de usuario · estado y upgrades de KYC · webhooks de verificación | ✅ |
| **Wallet** | Firma de transacciones · custodia de private keys · subsidio de gas | 🟡 interno por ahora |
| **Payments** | Checkout · QR · cobros merchant · reconciliación | ✅ |
| **Exchange** | Cotización PXO/USDC/MXN · feeds de precio | ✅ |
| **Tokens** | Metadata y operaciones on-chain del PXO (Polygon · BSC) | ✅ |
| **Notifications** | Email transaccional (Resend) · push a futuro | 🟡 interno por ahora |
| **Admin & Ops** | Panel admin · cron · auditoría · rate-limit | ❌ privado |

---

## Orquestación — ejemplo: "Comprar PXO"

Caso de uso que toca **5 dominios**. La lógica de composición vive **sólo** en el orquestador; cada dominio hace una cosa.

```mermaid
sequenceDiagram
    autonumber
    participant U as Usuario (Web)
    participant O as Orchestrator
    participant A as Auth
    participant K as Users & KYC
    participant X as Exchange
    participant W as Wallet
    participant T as Tokens
    participant N as Notifications

    U->>O: POST /buy { amount, currency }
    O->>A: verify JWT
    A-->>O: ok (userId, role)
    O->>K: kyc status
    K-->>O: approved
    O->>X: quote PXO/USDC
    X-->>O: 0.0577 USDC
    O->>W: sign & submit tx
    W->>T: transfer on-chain
    T-->>W: txHash
    W-->>O: confirmed
    O->>N: email receipt
    O-->>U: 201 { txHash, receipt }
```

---

## Estructura del monorepo

```
pxotoken/
├── apps/
│   ├── landing/       sitio público (Vite + React)
│   ├── web/           app principal — wallet, KYC, dashboard (Vite + React + Thirdweb)
│   ├── pagos/         checkout de pagos (Vite + React)
│   ├── pagos-api/     backend de pagos (Fastify · TS)
│   └── api/           API actual · handlers serverless (en migración a dominios)
├── packages/
│   ├── shared/        tipos, schemas, constantes
│   └── config/        configs base (TS, ESLint, Tailwind)
└── pnpm-workspace.yaml
```

**Dirección:** `apps/api` hoy concentra varios dominios como handlers serverless. La evolución es **separar** cada dominio en su propia unidad desplegable (estilo `pagos-api`, Fastify), y dejar el orquestador como capa independiente.

---

## Desarrollo local

```bash
pnpm install
pnpm dev                  # levanta web, landing, pagos, pagos-api
# api separado:
cd apps/api && ./node_modules/.bin/vercel dev --listen 3000
```

| App | URL |
|-----|-----|
| web | http://localhost:5173 |
| landing | http://localhost:5174 |
| pagos | http://localhost:5175 |
| pagos-api | http://localhost:3001 |
| api | http://localhost:3000 |

Variables de entorno: ver `.env.example` en cada app.
