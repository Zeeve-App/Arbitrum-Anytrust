import { Chain, Hex, createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import {
  ChainConfig,
  createRollupPrepareTransaction,
  createRollupPrepareTransactionReceipt,
  prepareNodeConfig,
} from "@arbitrum/orbit-sdk";

import { writeFile } from "fs/promises";
import { privateKeyToAccount } from "viem/accounts";
import { sanitizePrivateKey } from "./rollup";

function getRpcUrl(chain: Chain) {
  return chain.rpcUrls.default.http[0];
}

// set the parent chain and create a public client for it
const parentChain = arbitrumSepolia;
const parentChainPublicClient = createPublicClient({
  chain: parentChain,
  transport: http(),
});

export async function generateConfig(txHash: `0x${string}`) {
  try {
    // get the transaction
    const tx = createRollupPrepareTransaction(
      await parentChainPublicClient.getTransaction({ hash: txHash })
    );

    // get the transaction receipt
    const txReceipt = createRollupPrepareTransactionReceipt(
      await parentChainPublicClient.getTransactionReceipt({ hash: txHash })
    );

    // get the chain config from the transaction inputs
    const chainConfig: ChainConfig = JSON.parse(
      tx.getInputs()[0].config.chainConfig
    );
    // get the core contracts from the transaction receipt
    const coreContracts = txReceipt.getCoreContracts();

    // prepare the node config
    const nodeConfig = prepareNodeConfig({
      chainName: process.env.CHAIN_NAME!,
      chainConfig,
      coreContracts,
      batchPosterPrivateKey: process.env.BATCH_POSTER_PRIVATE_KEY!,
      validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY!,
      parentChainId: parentChain.id,
      parentChainRpcUrl: getRpcUrl(parentChain),
    });

    await writeFile("node-config.json", JSON.stringify(nodeConfig, null, 2));
    console.log(`Node config written to "node-config.json"`);

    // prepare the l3 config

    const deployerAddress = privateKeyToAccount(
    sanitizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY!)
    ).address;
    const stakerAddress = privateKeyToAccount(
    sanitizePrivateKey(process.env.VALIDATOR_PRIVATE_KEY!)
    ).address;
    const batchPosterAddress = privateKeyToAccount(
    sanitizePrivateKey(process.env.BATCH_POSTER_PRIVATE_KEY!)
    ).address;

    const l3Config = {
      networkFeeReceiver: deployerAddress,
      infrastructureFeeCollector: deployerAddress,
      staker: stakerAddress,
      batchPoster: batchPosterAddress,
      chainOwner: deployerAddress,
      chainId: chainConfig.chainId,
      chainName: process.env.CHAIN_NAME!,
      minL2BaseFee: 100000000,
      parentChainId: parentChain.id,
      "parent-chain-node-url": "https://sepolia-rollup.arbitrum.io/rpc",
      utils: coreContracts.validatorUtils,
      rollup: coreContracts.rollup,
      inbox: coreContracts.inbox,
      nativeToken: coreContracts.nativeToken,
      outbox: coreContracts.outbox,
      rollupEventInbox: coreContracts.rollupEventInbox,
      challengeManager: coreContracts.challengeManager,
      adminProxy: coreContracts.adminProxy,
      sequencerInbox: coreContracts.sequencerInbox,
      bridge: coreContracts.bridge,
      upgradeExecutor: coreContracts.upgradeExecutor,
      validatorUtils: coreContracts.validatorUtils,
      validatorWalletCreator: coreContracts.validatorWalletCreator,
      deployedAtBlockNumber: txReceipt.blockNumber,
    };

    // Convert BigInt to string before serialization
    const serializedObj = JSON.stringify(l3Config, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );

    await writeFile("l3-config.json", serializedObj);
    console.log(`Node config written to "l3-config.json"`);
  } catch (err: any) {
    console.log(err);
  }
}
