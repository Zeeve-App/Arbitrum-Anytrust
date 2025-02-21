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
exports.sanitizePrivateKey = sanitizePrivateKey;
exports.rollup = rollup;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const orbit_sdk_1 = require("@arbitrum/orbit-sdk");
const utils_1 = require("@arbitrum/orbit-sdk/utils");
function sanitizePrivateKey(privateKey) {
    if (!privateKey.startsWith('0x')) {
        return `0x${privateKey}`;
    }
    return privateKey;
}
function withFallbackPrivateKey(privateKey) {
    if (typeof privateKey === 'undefined') {
        return (0, accounts_1.generatePrivateKey)();
    }
    return sanitizePrivateKey(privateKey);
}
function getBlockExplorerUrl(chain) {
    var _a;
    return (_a = chain.blockExplorers) === null || _a === void 0 ? void 0 : _a.default.url;
}
if (typeof process.env.DEPLOYER_PRIVATE_KEY === 'undefined') {
    throw new Error(`Please provide the "DEPLOYER_PRIVATE_KEY" environment variable`);
}
// load or generate a random batch poster account
const batchPosterPrivateKey = withFallbackPrivateKey(process.env.BATCH_POSTER_PRIVATE_KEY);
const batchPoster = (0, accounts_1.privateKeyToAccount)(batchPosterPrivateKey).address;
const nativeToken = process.env.NATIVE_TOKEN || '0x0000000000000000000000000000000000000000';
// load or generate a random validator account
const validatorPrivateKey = withFallbackPrivateKey(process.env.VALIDATOR_PRIVATE_KEY);
const validator = (0, accounts_1.privateKeyToAccount)(validatorPrivateKey).address;
// set the parent chain and create a public client for it
const parentChain = chains_1.arbitrumSepolia;
const parentChainPublicClient = (0, viem_1.createPublicClient)({
    chain: parentChain,
    transport: (0, viem_1.http)()
});
// load the deployer account
const deployer = (0, accounts_1.privateKeyToAccount)(sanitizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY));
function rollup() {
    return __awaiter(this, void 0, void 0, function* () {
        // generate a random chain id
        const chainId = (0, utils_1.generateChainId)();
        // create the chain config
        const chainConfig = (0, orbit_sdk_1.prepareChainConfig)({
            chainId,
            arbitrum: {
                InitialChainOwner: deployer.address,
                DataAvailabilityCommittee: true
            }
        });
        if (nativeToken !== '0x0000000000000000000000000000000000000000') {
            const allowanceParams = {
                nativeToken: nativeToken,
                account: deployer.address,
                publicClient: parentChainPublicClient
            };
            if (!(yield (0, orbit_sdk_1.createRollupEnoughCustomFeeTokenAllowance)(allowanceParams))) {
                const approvalTxRequest = yield (0, orbit_sdk_1.createRollupPrepareCustomFeeTokenApprovalTransactionRequest)(allowanceParams);
                // sign and send the transaction
                const approvalTxHash = yield parentChainPublicClient.sendRawTransaction({
                    serializedTransaction: yield deployer.signTransaction(approvalTxRequest)
                });
                // get the transaction receipt after waiting for the transaction to complete
                const approvalTxReceipt = (0, orbit_sdk_1.createRollupPrepareTransactionReceipt)(yield parentChainPublicClient.waitForTransactionReceipt({
                    hash: approvalTxHash
                }));
                console.log(`Tokens approved in ${getBlockExplorerUrl(parentChain)}/tx/${approvalTxReceipt.transactionHash}`);
            }
        }
        const createRollupParams = {
            params: {
                config: (0, orbit_sdk_1.createRollupPrepareDeploymentParamsConfig)(parentChainPublicClient, {
                    chainId: BigInt(chainId),
                    owner: deployer.address,
                    chainConfig
                }),
                batchPosters: [batchPoster],
                validators: [validator]
            },
            account: deployer.address,
            publicClient: parentChainPublicClient
        };
        if (nativeToken !== '0x0000000000000000000000000000000000000000') {
            createRollupParams.params['nativeToken'] = nativeToken;
        }
        // prepare the transaction for deploying the core contracts
        const request = yield (0, orbit_sdk_1.createRollupPrepareTransactionRequest)(createRollupParams);
        // sign and send the transaction
        const txHash = yield parentChainPublicClient.sendRawTransaction({
            serializedTransaction: yield deployer.signTransaction(request)
        });
        // get the transaction receipt after waiting for the transaction to complete
        const txReceipt = (0, orbit_sdk_1.createRollupPrepareTransactionReceipt)(yield parentChainPublicClient.waitForTransactionReceipt({ hash: txHash }));
        console.log(`Deployed in ${getBlockExplorerUrl(parentChain)}/tx/${txReceipt.transactionHash}`);
        return txReceipt.transactionHash;
    });
}
