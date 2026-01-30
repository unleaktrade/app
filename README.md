# UnleakTrade Frontend - OTC Dashboard

A beautiful, fast, and responsive trading interface for **UnleakTrade** - Confidential OTC Trading on Solana.

![UnleakTrade Dashboard](https://unleak.trade)

## 🎯 Overview

UnleakTrade is a decentralized OTC (Over-The-Counter) trading platform built on Solana that enables institutional-grade privacy and fairness for everyone. This frontend provides an intuitive interface for creating RFQs (Request for Quotes) and submitting competitive quotes.

## ✨ Features

### 🏠 Unified Dashboard
- **Single view for all users** - No confusing role switchers
- **Real-time statistics** - 24h/7d/30d volume, active traders
- **Liquidity visualization** - Interactive donut chart showing token distribution
- **Live RFQ marketplace** - Browse and filter available RFQs
- **Two distinct CTAs**:
  - 🟣 **Create Request for Quote** (FOR MAKERS) - Purple gradient
  - 🔵 **Browse & Quote** (FOR TAKERS) - Cyan gradient

### 💎 Beautiful Design
- Dark theme (#0a0a0f background) matching UnleakTrade brand
- Glassmorphism effects with backdrop blur
- Purple/magenta gradient for Maker actions
- Cyan/turquoise gradient for Taker actions
- Smooth animations using Framer Motion
- Mobile-first responsive design

### 👥 Three User Roles

Based on the Solana settlement-engine program:

1. **Makers** - Create RFQs and select winning quotes
2. **Takers** - Browse RFQs and submit competitive quotes
3. **Facilitators** - Optional intermediaries who can claim fee shares

### 🔐 Security Features
- **Commit-Reveal Protocol** - Prevents quote manipulation
- **Liquidity Guard** - Ed25519 signature verification
- **Bond Collateral** - USDC bonds ensure commitment from both parties
- **Phase-based lifecycle** - Commit → Reveal → Selection → Fund

### 📊 RFQ Management

**Create RFQ (Makers):**
- Set base and quote token mint addresses
- Define trade amounts and token accounts (ATAs)
- Configure phase durations (commit, reveal, selection, fund)
- Optional bond amount settings

**Submit Quote (Takers):**
- View detailed RFQ summary
- See exchange rates and trade details
- Provide token account addresses
- Commit to exchange rate

**RFQ States:**
- 🟢 **Open** - Accepting quotes
- 🟡 **Pending** - Quote selected, awaiting funding
- 🔵 **Filled** - Trade matched, in progress
- 🟢 **Settled** - Successfully completed
- 🔴 **Expired** - Time limit exceeded
- 🟠 **Canceled** - Manually canceled

## 🛠 Tech Stack

- **React 18** - UI framework with hooks
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible component primitives
- **Sonner** - Toast notifications
- **Lucide React** - Icon library

## 🏗 Architecture

### Based on Settlement Engine

The frontend mirrors the Solana program structure:

```rust
// Key instructions from settlement-engine
- init_rfq()       → Create RFQ modal
- commit_quote()   → Submit Quote modal
- reveal_quote()   → Automatic reveal phase
- select_quote()   → Maker selection UI
- complete_settlement() → Settlement tracking
- withdraw_reward() → Facilitator rewards
```

### Data Model

```typescript
interface RFQ {
  id: string;
  pair: string;
  baseMint: string;
  quoteMint: string;
  baseAmount: number;
  quoteAmount: number;
  price: number;
  status: RFQState;
  expires: string | null;
  maker: string;
  taker?: string;
  facilitator?: string;  // Optional fee recipient
  bondAmount: number;
  takerFee: number;
  commitTtl: number;
  revealTtl: number;
  selectionTtl: number;
  fundTtl: number;
}
```

## 🎨 Design System

### Color Palette

- **Background**: `#0a0a0f` (deep dark)
- **Cards**: `#0f0f1a` (slightly lighter)
- **Borders**: `rgba(255, 255, 255, 0.1)` (subtle white)
- **Maker Actions**: Purple → Pink gradient (`from-purple-500 to-pink-500`)
- **Taker Actions**: Cyan → Blue gradient (`from-cyan-500 to-blue-500`)

### Status Colors

- Open: Green (`text-green-400`)
- Pending: Yellow (`text-yellow-400`)
- Filled: Cyan (`text-cyan-400`)
- Expired: Red (`text-red-400`)
- Canceled: Orange (`text-orange-400`)
- Settled: Emerald (`text-emerald-400`)

## 📱 Mobile Responsive

Fully responsive with breakpoints:
- **Mobile**: `< 640px` - Stacked layouts, compact stats
- **Tablet**: `640px - 1024px` - 2-column grids
- **Desktop**: `> 1024px` - Full 3-column layouts, side-by-side CTAs

## 🚀 Getting Started

This is a mockup interface - no web3 provider required yet. All data is mocked for demonstration.

### Key Components

```
/src/app/
├── App.tsx                   # Main app with routing
├── components/
│   ├── DashboardHome.tsx     # Main dashboard with stats & RFQ list
│   ├── BrowseRFQs.tsx        # Grid view of available RFQs
│   ├── CreateRFQModal.tsx    # Modal for makers to create RFQs
│   ├── SubmitQuoteModal.tsx  # Modal for takers to submit quotes
│   ├── RFQDetailsView.tsx    # Detailed RFQ view
│   └── Navigation.tsx        # Top nav with action buttons
└── data/
    └── mockRFQs.ts          # Mock RFQ data
```

## 🔮 Future Enhancements

### Phase 1 - Web3 Integration
- [ ] Phantom & Solflare wallet connection
- [ ] Real Solana program interaction
- [ ] Transaction signing and confirmation
- [ ] Live blockchain data fetching

### Phase 2 - Advanced Features
- [ ] Real-time quote updates via WebSocket
- [ ] Historical trade analytics
- [ ] Portfolio tracking
- [ ] Notification system
- [ ] Multi-language support

### Phase 3 - Facilitator Dashboard
- [ ] Facilitator-specific views
- [ ] Fee tracking and claims
- [ ] Liquidity proof management
- [ ] Advanced filtering and search

## 🤝 Contributing

Based on:
- [UnleakTrade Landing Page](https://github.com/unleaktrade/landing-page)
- [Settlement Engine](https://github.com/unleaktrade/settlement-engine)

## 📄 License

This is a demonstration interface for UnleakTrade.

---

Built with ❤️ for crypto traders and whales who demand privacy, fairness, and speed.
