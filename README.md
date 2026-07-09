# Solana Snipe Bot

A momentum / new-token sniping bot for Solana. It watches for brand-new tokens launching on
pump.fun, runs a set of safety checks, and buys the ones that pass — then manages exits with
automatic take-profit / stop-loss. Trades execute through **Jupiter's aggregator API**, which
routes across PumpSwap, Raydium, Orca, and Meteora for you.

## Read this before you run it live

New-token sniping is the highest-risk trading strategy on Solana. Be clear-eyed about what
you're doing:

- **Most new tokens are scams or worthless within hours.** Rug pulls, honeypots (tokens you can
  buy but not sell), and coordinated dumps on early buyers are common on pump.fun. The safety
  checks in this bot catch some of these patterns but not all of them — there is no filter that
  makes this safe, only ones that make it less bad.
- **You will lose money on a large fraction of trades.** That's normal for this strategy even
  when it's profitable overall. Position sizing and stop-losses exist to make sure no single loss
  is catastrophic — they don't prevent losses.
- **This executes real transactions with real funds** the moment `DRY_RUN=false`. Start in dry
  run, watch it for a while, and only fund it with money you can fully afford to lose.
- **Private key security is entirely on you.** `.env` holds your wallet's private key in plain
  text. Never commit it, never share it, and use a dedicated burner wallet — not one holding
  other assets.
- This is not financial advice, and I'm not a financial advisor. Nothing here is a recommendation
  to trade.

## How it works

1. **Detection** (`src/pumpMonitor.ts`) — subscribes to pump.fun's on-chain program logs and
   fires whenever a new token is created.
2. **Safety checks** (`src/safety.ts`) — before buying, checks that:
   - the mint and freeze authorities are renounced (creator can't inflate supply or freeze your
     tokens),
   - there's enough liquidity that the entry price impact is reasonable,
   - there's an actual route to sell the token back to SOL (a basic honeypot check).
3. **Entry** (`src/index.ts`) — buys tokens that pass, sized by `BUY_AMOUNT_SOL`.
4. **Exit** (`src/positionManager.ts`) — polls each open position's value and sells automatically
   at your configured take-profit or stop-loss thresholds.
5. **Risk management** (`src/riskManager.ts`) — caps concurrent positions and stops opening new
   trades once the day's realized losses hit `DAILY_LOSS_LIMIT_SOL`.

Trades are executed via Jupiter's swap API rather than by hand-building instructions against
pump.fun's program directly. Pump.fun has changed its on-chain account layout multiple times in
2026; letting Jupiter's team maintain that integration means this bot doesn't break every time
they do.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get a real RPC endpoint

Solana's public RPC (`api.mainnet-beta.solana.com`) is rate-limited and too slow for sniping —
by the time a public RPC tells you about a new pool, the good fills are gone. Get a low-latency
paid endpoint from one of:

- [Helius](https://helius.dev)
- [QuickNode](https://quicknode.com)
- [Triton](https://triton.one)
- [Chainstack](https://chainstack.com)

You'll need both an HTTP and a WebSocket URL from whichever you pick.

### 3. Generate a burner wallet

```bash
npm run generate-wallet
```

This prints a public key and a private key. Fund the public key with a small amount of SOL
(enough for a handful of `BUY_AMOUNT_SOL`-sized trades plus network fees) — don't overfund it.

### 4. Configure

```bash
cp .env.example .env
```

Fill in `RPC_HTTP_URL`, `RPC_WS_URL`, and `PRIVATE_KEY` from the steps above. Leave `DRY_RUN=true`
for now. Review the trading parameters — defaults are conservative but arbitrary; they're not
tuned to any particular market condition.

Optionally get a free or paid API key at [portal.jup.ag](https://portal.jup.ag) and set
`JUPITER_API_KEY` for higher rate limits (the bot works without one, just at a lower ceiling).

### 5. Run in dry run mode first

```bash
npm run dev
```

This detects real new tokens, runs real safety checks, and gets real quotes — but never sends a
transaction. Watch the logs (`logs/app.log`, `logs/trades.log`) for a while and get a feel for
how often it buys, what it filters out, and how it exits. Do not skip this step.

### 6. Go live (once you understand the risk)

Set `DRY_RUN=false` in `.env`, confirm your wallet balance with `npm run check-balance`, then:

```bash
npm run dev
```

## Configuration reference

| Variable | Meaning |
|---|---|
| `BUY_AMOUNT_SOL` | SOL spent per trade |
| `MAX_SLIPPAGE_BPS` | Max slippage tolerance in basis points (500 = 5%) |
| `MAX_PRICE_IMPACT_PCT` | Max acceptable price impact before skipping a token |
| `TAKE_PROFIT_PCT` / `STOP_LOSS_PCT` | Exit thresholds as % move from entry |
| `POSITION_CHECK_INTERVAL_MS` | How often open positions are re-valued |
| `MAX_CONCURRENT_POSITIONS` | Cap on simultaneous open positions |
| `DAILY_LOSS_LIMIT_SOL` | Circuit breaker: stop opening new trades after this much realized loss in a UTC day |

## Known limitations / where to go from here

- **Detection heuristic is log-string based.** It watches for an `"Instruction: Create"` log line
  from pump.fun's program. If pump.fun renames that instruction, detection breaks silently until
  updated — check [pump-public-docs](https://github.com/pump-fun/pump-public-docs) if the bot
  stops finding new tokens.
- **No holder-concentration check.** A token can pass every check here and still have 90% of
  supply sitting in one wallet ready to dump. Adding this needs an indexer (Helius, Shyft, or
  similar) to pull top holders — worth adding before trading with meaningful size.
- **No MEV protection.** Transactions go through your RPC's default path. If you're getting
  sandwiched, look into Jito bundles.
- **Single RPC, no failover.** If your provider hiccups, detection pauses. Fine for testing, worth
  hardening for anything you'd call "production."
- **Dry-run PnL is quote-based, not fill-based.** It estimates fills from Jupiter quotes at
  detection/exit time; real slippage and priority-fee competition will make live results worse
  than dry-run numbers suggest.

## Project structure

```
src/
  config.ts          env loading & validation
  wallet.ts           keypair loading
  connection.ts        Solana RPC connection
  jupiter.ts           quote/swap execution via Jupiter
  safety.ts            pre-buy safety checks
  pumpMonitor.ts        new-token detection
  positionManager.ts    open-position tracking, TP/SL
  riskManager.ts        position limits, daily loss circuit breaker
  index.ts              orchestrator / entry point
scripts/
  generate-wallet.ts    create a new burner wallet
  check-balance.ts       check wallet balance & config
```
