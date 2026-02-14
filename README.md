<div align="center">

# ♞ Knight Chess

### *A Strategic Chess Variant with 5 Knights on an Extended 8x9 Board*

[![Live Demo](https://img.shields.io/badge/Play_Now-knight--chess.vercel.app-000?style=for-the-badge&logo=vercel&logoColor=white)](https://knight-chess.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br/>

```
  ┌────┬────┬────┬────┬────┬────┬────┬────┐
9 │ ♜  │ ♞  │ ♝  │ ♛  │ ♚  │ ♝  │ ♞  │ ♜  │
  ├────┼────┼────┼────┼────┼────┼────┼────┤
8 │ ♞  │ ♟  │ ♞  │ ♟  │ ♟  │ ♟  │ ♞  │ ♟  │  ← 5 Knights per side
  ├────┼────┼────┼────┼────┼────┼────┼────┤
7 │    │    │    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┼────┼────┤
6 │    │    │    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┼────┼────┤
5 │    │    │    │    │    │    │    │    │  ← Extra rank!
  ├────┼────┼────┼────┼────┼────┼────┼────┤
4 │    │    │    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┼────┼────┤
3 │    │    │    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┼────┼────┤
2 │ ♘  │ ♙  │ ♘  │ ♙  │ ♙  │ ♙  │ ♘  │ ♙  │  ← 3 random pawns → knights
  ├────┼────┼────┼────┼────┼────┼────┼────┤
1 │ ♖  │ ♘  │ ♗  │ ♕  │ ♔  │ ♗  │ ♘  │ ♖  │
  └────┴────┴────┴────┴────┴────┴────┴────┘
    a     b    c    d    e    f    g    h
```

</div>

---

## What is Knight Chess?

**Knight Chess** is a chess variant that reimagines the classic game with two key twists:

1. **8x9 Board** — An extra rank adds strategic depth, giving pieces more room to maneuver
2. **5 Knights per Side** — 3 random pawns are replaced with knights at the start of each game, creating unique opening positions every time

The result is a game where knight tactics dominate, openings are unpredictable, and positional play takes on new meaning.

---

## Features

### Game Modes
| Mode | Description |
|------|-------------|
| **vs Computer** | Play against an AI opponent with 3 difficulty levels |
| **PvP** | Challenge other players in real-time multiplayer matches |

### AI Engine
- **Minimax algorithm** with alpha-beta pruning
- **3 difficulty levels** — Easy (5+3 Blitz), Medium (5+5 Blitz), Difficult (10+5 Rapid)
- **Intelligent blundering** system for realistic difficulty scaling
- **Position evaluation** with custom piece-square tables optimized for 8x9 board

### Token Economy
- Earn **1,000 tokens** on signup
- **Stake tokens** on each game — win to earn, lose to spend
- **Weekly login bonuses** to keep playing
- **Leaderboard** rankings based on tokens won and rating

### Full Chess Rules
- Castling, en passant, pawn promotion
- Check, checkmate, and stalemate detection
- 50-move rule and threefold repetition
- Time controls with increment

### Polish
- Sound effects for moves, captures, checks, and more
- Move history with algebraic notation
- Game replay system
- Board themes and piece sets
- Responsive design — desktop, tablet, and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Animation** | Framer Motion |
| **State** | Zustand |
| **Auth** | NextAuth.js |
| **Database** | Neon (PostgreSQL) |
| **ORM** | Drizzle ORM |
| **Sound** | Howler.js |
| **UI** | Radix UI primitives |
| **Deploy** | Vercel |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # Authentication pages
│   ├── (main)/             # Protected routes
│   │   ├── game/           # Active game page
│   │   ├── play/           # Game setup & matchmaking
│   │   ├── leaderboard/    # Rankings
│   │   ├── profile/        # Player profile
│   │   ├── replay/         # Game replay viewer
│   │   └── settings/       # User preferences
│   └── api/                # API routes
├── components/
│   ├── game/               # Board, Timer, Controls, Modals
│   └── layout/             # App shell & navigation
├── lib/
│   ├── ai/                 # AI engine (minimax, evaluation, blunder)
│   ├── chess/              # Core logic (board, moves, constants)
│   ├── db/                 # Database schema & connection
│   ├── token/              # Token economy service
│   ├── auth/               # Auth configuration
│   └── sound/              # Sound manager
├── stores/                 # Zustand stores (game, sound)
└── types/                  # TypeScript type definitions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech) recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/romizone/knight-chess.git
cd knight-chess

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and auth secrets

# Run database migrations
npx drizzle-kit push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start playing.

### Environment Variables

```env
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_URL=           # App URL (http://localhost:3000 for dev)
NEXTAUTH_SECRET=        # Random secret for NextAuth
```

---

## How the AI Works

The AI engine uses a classic **minimax algorithm with alpha-beta pruning**, adapted for the 8x9 board:

```
Difficulty    Depth    Blunder Rate    Time Control
─────────    ─────    ────────────    ────────────
Easy           2       High            5+3 (Blitz)
Medium         3       Medium          5+5 (Blitz)
Difficult      4       Low             10+5 (Rapid)
```

**Evaluation features:**
- Material counting with adjusted piece values (knights are weighted higher in this variant)
- Custom piece-square tables designed for the extended 9-rank board
- King safety, pawn structure, and center control
- Immediate checkmate detection (always plays winning move)

---

## License

This project is open source. See the repository for details.

---

<div align="center">

**[Play Knight Chess Now](https://knight-chess.vercel.app)**

Built with Next.js, TypeScript, and a love for chess.

</div>
