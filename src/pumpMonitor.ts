import { getConnection } from './connection';

const PUMP_PROGRAM = '6EF8rQNwhQf45Sxc1ED1r8PkMuc69G6wet6gEgFqQvfc';

export interface NewTokenEvent {
  mint: string;
  bondingCurve: string;
  associatedBondingCurve: string;
  creator: string;
  name: string;
  symbol: string;
  uri: string;
  timestamp: number;
}

export async function startPumpMonitor(onNewToken: (event: NewTokenEvent) => void): Promise<void> {
  const conn = getConnection();

  console.log(`Starting pump.fun monitor on program: ${PUMP_PROGRAM}`);

  const subscriptionId = conn.onLogs(
    PUMP_PROGRAM,
    (logs) => {
      // Look for "Instruction: Create" which indicates a new token
      const hasCreateInstruction = logs.logs.some((log) =>
        log.includes('Instruction: Create')
      );

      if (hasCreateInstruction) {
        console.log(`[PUMP] New token created! Signature: ${logs.signature}`);

        // In a real scenario, you'd parse the logs or transaction to extract
        // mint, bondingCurve, creator, name, symbol, uri
        // For now, this is a placeholder
        const event: NewTokenEvent = {
          mint: 'placeholder_mint',
          bondingCurve: 'placeholder_bc',
          associatedBondingCurve: 'placeholder_abc',
          creator: 'placeholder_creator',
          name: 'PlaceholderToken',
          symbol: 'PHTOKEN',
          uri: 'https://example.com',
          timestamp: Date.now(),
        };

        onNewToken(event);
      }
    },
    'confirmed'
  );

  console.log(`Subscription ID: ${subscriptionId}`);
}
