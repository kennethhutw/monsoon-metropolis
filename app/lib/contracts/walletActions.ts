// Client-side contract writes signed by the user's OWN connected wallet
// (via wagmi's useWalletClient — see hooks/useWallet.ts). These are the
// actions ComplianceRegistry/InvoiceAsset/FinancingPool authorize by
// msg.sender, so they cannot be done with a shared backend key — see the
// scope note at the top of real.ts. Call these directly from 'use client'
// page components; there is no mock/real switch here because mock mode
// never needs a wallet at all (pages call mock.ts's simulated versions
// instead, unconditionally, when NEXT_PUBLIC_CONTRACT_MODE !== 'real').

import type { Abi, Address, ContractFunctionArgs, ContractFunctionName, Hash, WalletClient } from 'viem'
import { parseEventLogs } from 'viem'
import { publicClient, contractAddresses, monadTestnet } from './config'
import { invoiceAssetAbi } from './abis/invoiceAsset'
import { financingPoolAbi } from './abis/financingPool'

/**
 * simulateContract first (so a revert throws a clearly-decoded error, e.g.
 * a custom error name, BEFORE any gas is spent), then send exactly what was
 * simulated, then confirm and hard-fail if the mined tx still reverted —
 * writeContract/waitForTransactionReceipt alone do NOT throw on revert by
 * default, which previously surfaced as a confusing downstream error
 * ("event not found") instead of the real on-chain revert reason.
 */
async function simulateAndWrite<
  const abi extends Abi,
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
>(
  walletClient: WalletClient,
  params: {
    address: Address
    abi: abi
    functionName: functionName
    args: ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>
  },
) {
  const [account] = await walletClient.getAddresses()
  const { request } = await publicClient.simulateContract({ ...params, account })
  const txHash = await walletClient.writeContract(request as never)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') {
    throw new Error(
      `Transaction reverted on-chain despite passing simulation — check ${monadTestnet.blockExplorers.default.url}/tx/${txHash}`,
    )
  }
  return { txHash, receipt }
}

/** Exporter mints an invoice NFT — msg.sender becomes the invoice's exporterWallet. */
export async function mintInvoice(
  walletClient: WalletClient,
  args: {
    invoiceHash: Hash
    amount: bigint
    dueDate: bigint
    buyerWallet: Address
    cvaTokenId: string
    metadataURI: string
  },
): Promise<{ txHash: Hash; tokenId: bigint }> {
  const { txHash, receipt } = await simulateAndWrite(walletClient, {
    address: contractAddresses.invoiceAsset,
    abi: invoiceAssetAbi,
    functionName: 'mintInvoice',
    args: [args.invoiceHash, args.amount, args.dueDate, args.buyerWallet, args.cvaTokenId, args.metadataURI],
  })
  const [event] = parseEventLogs({ abi: invoiceAssetAbi, eventName: 'InvoiceMinted', logs: receipt.logs })
  if (!event) throw new Error('mintInvoice confirmed but InvoiceMinted event was not found in the receipt')
  return { txHash, tokenId: event.args.tokenId }
}

/** Buyer confirms the receivable — digital Notice of Assignment. */
export async function confirmReceivable(walletClient: WalletClient, tokenId: bigint): Promise<{ txHash: Hash }> {
  const { txHash } = await simulateAndWrite(walletClient, {
    address: contractAddresses.invoiceAsset,
    abi: invoiceAssetAbi,
    functionName: 'confirmReceivable',
    args: [tokenId],
  })
  return { txHash }
}

/** Exporter locks the invoice NFT and submits a financing request. Requires
 *  invoiceAsset.approve(financingPool, tokenId) to have been called first. */
export async function submitCase(walletClient: WalletClient, tokenId: bigint): Promise<{ txHash: Hash; caseId: bigint }> {
  const { txHash, receipt } = await simulateAndWrite(walletClient, {
    address: contractAddresses.financingPool,
    abi: financingPoolAbi,
    functionName: 'submitCase',
    args: [tokenId],
  })
  const [event] = parseEventLogs({ abi: financingPoolAbi, eventName: 'CaseSubmitted', logs: receipt.logs })
  if (!event) throw new Error('submitCase confirmed but CaseSubmitted event was not found in the receipt')
  return { txHash, caseId: event.args.caseId }
}

/** Exporter approves the FinancingPool to transfer a specific invoice NFT — must run before submitCase. */
export async function approveInvoiceTransfer(walletClient: WalletClient, tokenId: bigint): Promise<{ txHash: Hash }> {
  const { txHash } = await simulateAndWrite(walletClient, {
    address: contractAddresses.invoiceAsset,
    abi: invoiceAssetAbi,
    functionName: 'approve',
    args: [contractAddresses.financingPool, tokenId],
  })
  return { txHash }
}

/** Bank approves a financing case. Must be called from the FinancingPool's configured bankWallet. */
export async function approveCase(
  walletClient: WalletClient,
  caseId: bigint,
  riskScore: bigint,
  ccpAuditHash: Hash,
): Promise<{ txHash: Hash }> {
  const { txHash } = await simulateAndWrite(walletClient, {
    address: contractAddresses.financingPool,
    abi: financingPoolAbi,
    functionName: 'approveCase',
    args: [caseId, riskScore, ccpAuditHash],
  })
  return { txHash }
}

/** Bank rejects a financing case — NFT returned to the exporter. */
export async function rejectCase(walletClient: WalletClient, caseId: bigint, reason: string): Promise<{ txHash: Hash }> {
  const { txHash } = await simulateAndWrite(walletClient, {
    address: contractAddresses.financingPool,
    abi: financingPoolAbi,
    functionName: 'rejectCase',
    args: [caseId, reason],
  })
  return { txHash }
}

/** Bank disburses the advance amount to the exporter. Must be called from bankWallet. */
export async function disburse(walletClient: WalletClient, caseId: bigint): Promise<{ txHash: Hash }> {
  const { txHash } = await simulateAndWrite(walletClient, {
    address: contractAddresses.financingPool,
    abi: financingPoolAbi,
    functionName: 'disburse',
    args: [caseId],
  })
  return { txHash }
}

const erc20Abi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

/** Approves the FinancingPool to pull `amount` of the settlement stablecoin from the caller. */
export async function approveStablecoin(walletClient: WalletClient, amount: bigint): Promise<{ txHash: Hash }> {
  const { txHash } = await simulateAndWrite(walletClient, {
    address: contractAddresses.stablecoin,
    abi: erc20Abi,
    functionName: 'approve',
    args: [contractAddresses.financingPool, amount],
  })
  return { txHash }
}

export async function getStablecoinAllowance(owner: Address): Promise<bigint> {
  return publicClient.readContract({
    address: contractAddresses.stablecoin,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, contractAddresses.financingPool],
  })
}

/** Buyer repays — requires prior USDC approve() to the FinancingPool for the exact repayment amount. */
export async function repay(walletClient: WalletClient, caseId: bigint): Promise<{ txHash: Hash }> {
  const { txHash } = await simulateAndWrite(walletClient, {
    address: contractAddresses.financingPool,
    abi: financingPoolAbi,
    functionName: 'repay',
    args: [caseId],
  })
  return { txHash }
}
