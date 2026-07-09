import { Connection } from '@solana/web3.js';
import { config } from './config';

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(config.rpcHttpUrl, {
      commitment: 'confirmed',
      wsEndpoint: config.rpcWsUrl,
    });
  }
  return connection;
}

export async function testConnection(): Promise<boolean> {
  try {
    const conn = getConnection();
    const slot = await conn.getSlot();
    console.log(`✓ Connected to Solana. Current slot: ${slot}`);
    return true;
  } catch (e) {
    console.error(`✗ Connection test failed: ${e}`);
    return false;
  }
}
