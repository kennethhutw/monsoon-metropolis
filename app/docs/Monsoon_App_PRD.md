# Monsoon — Web App PRD
**Version:** 1.0  
**Date:** 2026-07-30  
**Project:** Cleanverse Build: Trusted Assets Hackathon — RWA Track  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase (Mock-first)

---

## 1. Product Vision

Monsoon is a compliant trade receivables financing platform that digitizes the full invoice financing lifecycle — from exporter KYB to bank approval — with Cleanverse CVI and CVA embedded at every trust-critical step.

**Design Principle:** Mock-first development. All Cleanverse API and blockchain calls use mock mode during development, controlled by environment variables. TODO annotations mark every integration point for production replacement.

---

## 2. User Roles & Access

| Role | Description | Key Permissions |
|---|---|---|
| **Exporter (Seller)** | SME exporter seeking invoice financing | Upload invoices, apply for financing, view status |
| **Buyer (Importer)** | Core enterprise confirming payables | Confirm receivables on-chain, view history |
| **Bank Staff** | Financing institution reviewing applications | Risk review, approve/reject, view analytics |
| **Admin** | Platform operator | User management, system config, monitoring |

---

## 3. Site Map

```
/
├── (public)
│   ├── /                    Landing Page
│   ├── /login               Login
│   └── /register            Register + KYB Onboarding
│
├── (exporter)               Exporter Portal
│   ├── /dashboard           Dashboard — quota, funding progress
│   ├── /invoices            Invoice Management
│   ├── /invoices/upload     Upload Invoice
│   ├── /invoices/[id]       Invoice Detail
│   ├── /financing           Financing Applications
│   ├── /financing/apply     New Application
│   ├── /financing/[id]      Application Detail & Status
│   └── /settings            Account & KYB Settings
│
├── (buyer)                  Buyer Portal
│   ├── /dashboard           Dashboard — pending confirmations
│   ├── /receivables         Receivables List
│   ├── /receivables/[id]    Confirm Receivable (NoA)
│   └── /history             Confirmation History
│
├── (bank)                   Bank Portal
│   ├── /dashboard           Risk Overview Dashboard
│   ├── /cases               Case Management List
│   ├── /cases/[id]          Case Detail + AI Risk Score
│   ├── /assets              On-chain Asset Monitor
│   └── /reports             Compliance Reports
│
└── (admin)                  Admin Portal
    ├── /dashboard           System Overview
    ├── /users               User Management
    ├── /kyb                 KYB Review Queue
    ├── /limits              Credit Limit Settings
    ├── /rates               Interest Rate Config
    ├── /blockchain          Blockchain Monitor
    └── /settings            System Settings
```

---

## 4. Page-by-Page Requirements

### 4.1 Landing Page `/`

**Purpose:** Introduce Monsoon to first-time visitors, drive registration.

**Sections:**
- Hero: tagline, CTA "Get Started"
- Problem: 3 pain points (payment gap, fraud, slow confirmation)
- Solution: 6-step workflow diagram
- CVI/CVA integration highlight
- Supported chains (Monad logo)
- CTA: Register as Exporter / Bank Partner

**Empty State:** N/A (always has content)

---

### 4.2 Register + KYB Onboarding `/register`

**Purpose:** Multi-step onboarding with identity verification.

**Steps:**
1. Role selection (Exporter / Buyer / Bank)
2. Basic info (company name, email, password)
3. KYB Form:
   - Company registration number
   - UBO declaration
   - Document upload (registration cert, bank statement)
4. Wallet connection (MetaMask / WalletConnect)
5. CVI binding confirmation

**Mock Mode:**
```typescript
// TODO: Replace with Cleanverse CVI API
// POST /api/cvi/issue { walletAddress, kybData }
const mockCVI = {
  cviToken: "0xMOCK_CVI_TOKEN",
  walletAddress: formData.wallet,
  issuedAt: new Date().toISOString(),
  status: "active"
}
```

**Validation:**
- All fields required before proceeding to next step
- Document upload: PDF/JPG/PNG, max 10MB
- Wallet address: valid EVM format

**Empty State:** Progress bar shows 0% on first load

---

### 4.3 Exporter Dashboard `/dashboard`

**Purpose:** At-a-glance financing status and available quota.

**Components:**
- Available Credit Limit (progress bar)
- Total Financed Amount (current month)
- Pending Applications count
- Active Invoices count
- Recent Activity feed (last 5 actions)
- Quick Action buttons: Upload Invoice, Apply for Financing

**Data (Mock):**
```typescript
// TODO: Replace with Supabase real-time queries
const mockDashboard = {
  creditLimit: 500000,
  usedLimit: 180000,
  pendingApplications: 2,
  activeInvoices: 5,
  recentActivity: [...]
}
```

**Empty State:** First-time user sees onboarding checklist (Complete KYB → Upload first invoice → Apply for financing)

---

### 4.4 Upload Invoice `/invoices/upload`

**Purpose:** Invoice submission with anti-duplicate protection.

**Form Fields:**
- Invoice PDF/image upload
- Invoice number (manual input or OCR auto-fill)
- Invoice amount
- Invoice date + due date
- Buyer selection (dropdown from approved buyers)
- PO number (optional)
- Delivery order number (optional)

**Core Logic — Anti-Double Financing:**
```typescript
// Generate unique hash on upload
const invoiceHash = sha256(`${companyId}-${invoiceNumber}-${amount}`)

// TODO: Replace mock check with CVA API duplicate check
// POST /api/cva/check-duplicate { hash: invoiceHash }
const isDuplicate = await mockCheckDuplicate(invoiceHash)
if (isDuplicate) {
  throw new Error("Invoice already exists in the system")
}
```

**Mock CVA Minting:**
```typescript
// TODO: Replace with Cleanverse CVA API
// POST /api/cva/mint { invoiceHash, amount, buyerCVI, sellerCVI }
const mockCVA = {
  cvaTokenId: `CVA-${Date.now()}`,
  invoiceHash,
  status: "minted",
  transferRestrictions: ["whitelist_only"],
  txHash: "0xMOCK_TX_HASH"
}
```

**Empty State:** Drag-and-drop zone with upload icon

---

### 4.5 Financing Application `/financing/apply`

**Purpose:** Select invoices and submit financing request.

**Steps:**
1. Select verified invoices (checkbox list)
2. Set financing amount (up to 80–90% of invoice value)
3. Review terms (interest rate, tenure)
4. Digital signature confirmation
5. Submit

**Validation:**
- Only CVA-minted invoices eligible
- Amount cannot exceed credit limit
- Buyer must have confirmed receivable (or master agreement exists)

**Empty State:** "No eligible invoices yet — upload and verify your first invoice"

---

### 4.6 Application Detail `/financing/[id]`

**Purpose:** Track financing application status in real time.

**Status Flow:**
```
Submitted → KYB Verified → AI Scoring → Bank Review → Approved → Disbursed → Repaid
```

**Components:**
- Status stepper (visual progress)
- AI Risk Score panel (0–100, with breakdown)
- Invoice details summary
- CVA token info + blockchain explorer link (mock)
- Timeline of actions

**Mock AI Score:**
```typescript
// TODO: Replace with real AI risk model (OpenAI / rules engine)
const mockRiskScore = {
  total: 82,
  breakdown: {
    buyerCredit: 88,
    invoiceAuthenticity: 95,
    cviStatus: 100,
    historicalRepayment: 75,
    industryRisk: 70
  },
  recommendation: "APPROVE",
  confidence: 0.87
}
```

---

### 4.7 Buyer Receivables Confirmation `/receivables/[id]`

**Purpose:** Buyer confirms invoice — digital equivalent of Notice of Assignment (NoA).

**Components:**
- Invoice details display (amount, due date, seller info)
- CVA token preview
- "Confirm Receivable" button → triggers on-chain confirmation (mock)
- "Dispute" button → opens dispute form

**Mock On-chain Confirmation:**
```typescript
// TODO: Replace with actual smart contract call
// contract.confirmReceivable(cvaTokenId, buyerCVIAddress)
const mockConfirmation = {
  txHash: "0xMOCK_CONFIRM_TX",
  confirmedAt: new Date().toISOString(),
  cvaStatus: "buyer_confirmed"
}
```

**Empty State:** "No pending receivables to confirm"

---

### 4.8 Bank Case Management `/cases`

**Purpose:** Bank staff reviews all incoming financing applications.

**Components:**
- Filter tabs: All / Pending / Approved / Rejected
- Case list table: Applicant | Amount | AI Score | CVI Status | CVA Status | Action
- Sort by: Date, Amount, Risk Score
- Bulk actions: Export CSV

**Color coding:**
- AI Score ≥ 80: green badge
- AI Score 60–79: yellow badge  
- AI Score < 60: red badge

**Empty State:** "No cases in this category"

---

### 4.9 Case Detail + Risk Engine `/cases/[id]`

**Purpose:** Full risk analysis view for bank reviewer.

**Components:**
- Applicant info + CVI verification status
- Invoice details + CVA token info
- AI Risk Score breakdown (radar chart)
- 14-point risk indicator checklist
- Blockchain record panel (mock Hash + mock Tx)
- CCP Protocol compliance log
- Approve / Reject / Request More Info buttons

**Mock CCP Log:**
```typescript
// TODO: Replace with Cleanverse CCP Protocol API
const mockCCPLog = {
  ruleChecks: [
    { rule: "CVI_VALID", passed: true },
    { rule: "CVA_AUTHENTIC", passed: true },
    { rule: "NO_DUPLICATE", passed: true },
    { rule: "BUYER_CONFIRMED", passed: true },
    { rule: "BLACKLIST_CLEAR", passed: true }
  ],
  travelRuleData: { ... },
  auditReportUrl: "/mock-audit-report.pdf"
}
```

---

### 4.10 Admin Dashboard `/admin/dashboard`

**Purpose:** System-wide monitoring and control.

**Metrics:**
- Total applications (today / this month)
- Total financed amount
- Average AI risk score
- CVI issuance count
- CVA minting count
- System health indicators

---

## 5. Global Components

| Component | Description |
|---|---|
| `<Navbar />` | Role-aware navigation, wallet connection status, CVI badge |
| `<CVIBadge />` | Shows CVI verification status (Active / Pending / Revoked) |
| `<CVACard />` | Invoice NFT preview with token ID, status, restrictions |
| `<RiskScoreGauge />` | Circular gauge 0–100 with color zones |
| `<BlockchainRecord />` | Mock tx hash display with copy + explorer link |
| `<EmptyState />` | Reusable empty state with icon, message, CTA |
| `<StatusStepper />` | Multi-step progress indicator |
| `<MockBadge />` | Dev-mode indicator on all mock data (hidden in production) |

---

## 6. Environment Variables

```env
# App Mode
NEXT_PUBLIC_MOCK_MODE=true          # Toggle mock/real API

# Cleanverse API (TODO: Real keys after onboarding)
CLEANVERSE_API_KEY=mock_key
CLEANVERSE_SANDBOX_URL=https://sandbox.cleanverse.com

# Blockchain (TODO: Real RPC after contract deployment)
NEXT_PUBLIC_CHAIN_ID=41454          # Monad Testnet
NEXT_PUBLIC_RPC_URL=mock_rpc

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Contract Addresses (TODO: Fill after deployment)
NEXT_PUBLIC_INVOICE_ASSET_ADDRESS=0x_TODO
NEXT_PUBLIC_FINANCING_POOL_ADDRESS=0x_TODO
NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS=0x_TODO
```

---

## 7. Mock Data Seed

Run `npm run seed` to populate Supabase with:
- 3 exporter accounts (with mock CVI)
- 2 buyer accounts (with mock CVI)
- 1 bank staff account
- 10 sample invoices (mix of statuses)
- 5 financing applications (mix of stages)
- Mock AI scores and blockchain records

---

## 8. Development Phases

| Phase | Scope | Target |
|---|---|---|
| **Phase 1 — Hackathon MVP** | All pages with mock data, core workflow end-to-end | Aug 8–9, 2026 |
| **Phase 2 — CVI/CVA Integration** | Replace mocks with real Cleanverse API | Aug 10–14, 2026 |
| **Phase 3 — Contract Integration** | Connect frontend to deployed smart contracts | Post-hackathon |
| **Phase 4 — Production** | Real KYB, real payments, multi-chain | Q4 2026 |

---

## 9. Non-Functional Requirements

- **Performance:** Page load < 2s on 4G connection
- **Responsive:** Desktop-first, mobile-compatible
- **Accessibility:** WCAG 2.1 AA
- **Security:** All API calls server-side, no private keys in frontend
- **Mock Safety:** Mock mode cannot accidentally call real APIs (env guard)

---

*Monsoon App PRD v1.0 — Kenneth / Taiwan Financial Training Institute*
