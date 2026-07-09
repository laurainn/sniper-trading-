# Solana Snipe Bot – Setup & Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate a Burner Wallet
```bash
npm run generate-wallet
```

**Output:**
```
=== NEW BURNER WALLET ===

Public Key (deposit SOL here):
YOUR_PUBLIC_KEY_HERE

Private Key (BASE58 - keep secret!):
YOUR_PRIVATE_KEY_HERE

Add this to your .env file:
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
```

Copy the private key and paste it into `.env`:
```bash
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
```

### 3. Fund the Wallet (Test Amount)
Send a small amount of SOL to the public key. For testing:
- Start with **0.5 SOL** (enough for ~10 trades at 0.05 SOL each + fees)
- Use the Solana devnet faucet or send from an exchange

### 4. Check Configuration & Balance
```bash
npm run check-balance
```

**Expected output:**
```
=== WALLET INFO ===
Address: YOUR_PUBLIC_KEY_HERE
Balance: 0.5000 SOL

Configuration:
  BUY_AMOUNT_SOL: 0.05
  MAX_CONCURRENT_POSITIONS: 3
  Estimated capacity: ~10 trades
  DRY_RUN: true
```

### 5. Start in Dry-Run Mode
```bash
npm run dev
```

**You'll see:**
```
========== SOLANA SNIPE BOT STARTING ==========
Mode: DRY RUN
✓ Connected to Solana. Current slot: 12345678
Wallet: YOUR_PUBLIC_KEY_HERE
Starting pump.fun monitor...
========== BOT READY ==========
```

---

## What to Expect During Dry Run

The bot will:

1. **Listen for new tokens** on pump.fun (every few seconds, new tokens launch)
2. **Filter tokens** through safety checks:
   - ✅ Mint authority renounced?
   - ✅ Sufficient liquidity?
   - ✅ Can sell back to SOL (honeypot check)?
3. **Log results** to `logs/app.log` and `logs/trades.log`

### Sample Log Output

**Good token (passes safety checks):**
```
[PUMP] New token created! Signature: 5xY...
[TRADE] NEW TOKEN: MOON (moo...t1234)
  ✓ Safety checks passed
  [DRY] Would buy 12345.67 tokens at ~$0.00000042
[STATUS] Positions: 1/3 | Daily Loss: 0.0000 SOL
```

**Bad token (fails safety checks):**
```
[PUMP] New token created! Signature: 7pZ...
[TRADE] NEW TOKEN: SCAM (scm...z5678)
  ✗ Safety checks failed:
    - Mint authority not renounced
    - Price impact too high: 45.32%
```

---

## Files & Logs

**Application log:**
```bash
cat logs/app.log
```
Shows connection status, configuration, and general system logs.

**Trades log:**
```bash
cat logs/trades.log
```
Shows every token detected, safety check results, and exit signals (TP/SL).

---

## Trading Parameters (in `.env`)

| Parameter | Current | Meaning |
|---|---|---|
| `BUY_AMOUNT_SOL` | 0.05 | SOL per trade |
| `MAX_SLIPPAGE_BPS` | 500 | Max slippage (5%) |
| `MAX_PRICE_IMPACT_PCT` | 15 | Max price impact before skip |
| `TAKE_PROFIT_PCT` | 50 | Exit at +50% |
| `STOP_LOSS_PCT` | 25 | Exit at -25% |
| `POSITION_CHECK_INTERVAL_MS` | 5000 | Re-check positions every 5s |
| `MAX_CONCURRENT_POSITIONS` | 3 | Max open trades at once |
| `DAILY_LOSS_LIMIT_SOL` | 0.5 | Stop trading if down 0.5 SOL today |

---

## Troubleshooting

### ❌ "Failed to connect to Solana RPC"
- Check `RPC_HTTP_URL` and `RPC_WS_URL` in `.env`
- Test with: `curl https://api.mainnet-beta.solana.com`
- Consider upgrading to a paid RPC (Helius, QuickNode)

### ❌ "No tokens detected for hours"
- Detection depends on pump.fun logs — may vary by time of day
- Check pump.fun directly: https://pump.fun
- If detection heuristic breaks, check [pump-public-docs](https://github.com/pump-fun/pump-public-docs)

### ❌ "Private key error"
- Ensure `PRIVATE_KEY` is in BASE58 format (not hex, not JSON)
- Run `npm run generate-wallet` to get a fresh one

### ❌ "Insufficient balance" (when going live)
- Make sure wallet has enough SOL for trades + network fees
- Each trade needs: `BUY_AMOUNT_SOL + 0.001 SOL (fees)`

---

## When to Go Live

Only switch `DRY_RUN=false` once you:

1. ✅ Watched dry-run for **at least 1-2 hours**
2. ✅ Saw the safety checks filtering real tokens
3. ✅ Checked the logs for errors or unexpected behavior
4. ✅ Understood the risks (most new tokens are scams)
5. ✅ Funded wallet with amount you **can afford to lose**

To go live:
```bash
# 1. Edit .env and change:
DRY_RUN=false

# 2. Verify balance one more time:
npm run check-balance

# 3. Start the bot:
npm run dev
```

---

## Key Safety Features

- **Mint authority check** — Creator can't inflate supply
- **Honeypot detection** — Tests if you can sell back to SOL
- **Liquidity check** — Ensures entry price impact is reasonable
- **Position limits** — Max 3 open trades at once
- **Daily loss cap** — Stops opening trades after 0.5 SOL loss
- **Automatic exits** — TP at +50%, SL at -25%

---

## Support & Next Steps

- Check logs in `logs/` directory for detailed diagnostics
- Review `src/safety.ts` to understand filter logic
- Modify trading parameters in `.env` to experiment
- See README.md for known limitations and roadmap

**Questions?** Start dry-run and observe the logs. Most issues are obvious from log output.
