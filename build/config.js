"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfig = void 0;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const orbit_sdk_1 = require("@arbitrum/orbit-sdk");
const promises_1 = require("fs/promises");
const accounts_1 = require("viem/accounts");
const rollup_1 = require("./rollup");
function getRpcUrl(chain) {
    return chain.rpcUrls.default.http[0];
}
// set the parent chain and create a public client for it
const parentChain = chains_1.arbitrumSepolia;
const parentChainPublicClient = (0, viem_1.createPublicClient)({
    chain: parentChain,
    transport: (0, viem_1.http)(),
});
function generateConfig(txHash) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // get the transaction
            const tx = (0, orbit_sdk_1.createRollupPrepareTransaction)(yield parentChainPublicClient.getTransaction({ hash: txHash }));
            // get the transaction receipt
            const txReceipt = (0, orbit_sdk_1.createRollupPrepareTransactionReceipt)(yield parentChainPublicClient.getTransactionReceipt({ hash: txHash }));
            // get the chain config from the transaction inputs
            const chainConfig = JSON.parse(tx.getInputs()[0].config.chainConfig);
            // get the core contracts from the transaction receipt
            const coreContracts = txReceipt.getCoreContracts();
            // prepare the node config
            const nodeConfig = (0, orbit_sdk_1.prepareNodeConfig)({
                chainName: process.env.CHAIN_NAME,
                chainConfig,
                coreContracts,
                batchPosterPrivateKey: process.env.BATCH_POSTER_PRIVATE_KEY,
                validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY,
                parentChainId: parentChain.id,
                parentChainRpcUrl: getRpcUrl(parentChain),
            });
            yield (0, promises_1.writeFile)("node-config.json", JSON.stringify(nodeConfig, null, 2));
            console.log(`Node config written to "node-config.json"`);
            // prepare the l3 config
            const deployerAddress = (0, accounts_1.privateKeyToAccount)((0, rollup_1.sanitizePrivateKey)(process.env.DEPLOYER_PRIVATE_KEY)).address;
            const stakerAddress = (0, accounts_1.privateKeyToAccount)((0, rollup_1.sanitizePrivateKey)(process.env.VALIDATOR_PRIVATE_KEY)).address;
            const batchPosterAddress = (0, accounts_1.privateKeyToAccount)((0, rollup_1.sanitizePrivateKey)(process.env.BATCH_POSTER_PRIVATE_KEY)).address;
            const l3Config = {
                networkFeeReceiver: deployerAddress,
                infrastructureFeeCollector: deployerAddress,
                staker: stakerAddress,
                batchPoster: batchPosterAddress,
                chainOwner: deployerAddress,
                chainId: chainConfig.chainId,
                chainName: process.env.CHAIN_NAME,
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
            const serializedObj = JSON.stringify(l3Config, (key, value) => typeof value === "bigint" ? value.toString() : value);
            yield (0, promises_1.writeFile)("l3-config.json", serializedObj);
            console.log(`Node config written to "l3-config.json"`);
        }
        catch (err) {
            console.log(err);
        }
    });
}
exports.generateConfig = generateConfig;
