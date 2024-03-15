import * as dotenv from 'dotenv';
import * as readlineSync from 'readline-sync';
dotenv.config({ path: __dirname + '/../.env' });
import { rollup } from './rollup';
import { generateConfig } from './config';

type hash = `0x${string}`;

async function main() {
  let txHash: hash;

  const useOldTxHash = readlineSync.keyInYNStrict('Do you want to use an old transaction hash?');

  if (useOldTxHash) {
    txHash = readlineSync.question('Enter the old transaction hash: ') as hash;
  } else {
    // Generate a new transaction hash
    txHash = await rollup();
  }

  generateConfig(txHash);
}

main();
