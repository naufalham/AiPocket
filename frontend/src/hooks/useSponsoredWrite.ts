"use client";

import { useAccount, useWriteContract, useCapabilities, useSendCalls } from "wagmi";
import { baseSepolia } from "viem/chains";
import { encodeFunctionData } from "viem";
import { paymasterCapabilities } from "@/lib/paymaster";

/**
 * Hook that uses sponsored transactions when the wallet supports EIP-5792
 * (e.g., Coinbase Smart Wallet), and falls back to standard writeContract
 * for EOA wallets (e.g., MetaMask).
 */
export function useSponsoredWrite() {
  const { address } = useAccount();

  const { data: capabilities } = useCapabilities({ account: address });

  const supportsAtomicBatch = (() => {
    if (!capabilities || !paymasterCapabilities) return false;
    const chainCaps = capabilities[baseSepolia.id];
    return chainCaps?.atomicBatch?.supported === true;
  })();

  // Sponsored path (smart wallet) - uses EIP-5792 sendCalls
  const {
    sendCalls,
    isPending: isSponsoredPending,
    isSuccess: isSponsoredSuccess,
    isError: isSponsoredError,
  } = useSendCalls();

  // Fallback path (EOA wallet)
  const {
    writeContract,
    isPending: isStandardPending,
    isSuccess: isStandardSuccess,
    isError: isStandardError,
  } = useWriteContract();

  const write = (params: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
    value?: bigint;
  }) => {
    if (supportsAtomicBatch) {
      const data = encodeFunctionData({
        abi: params.abi as any,
        functionName: params.functionName,
        args: params.args as any,
      });
      sendCalls({
        calls: [
          {
            to: params.address,
            data,
            value: params.value,
          },
        ],
        capabilities: paymasterCapabilities,
      });
    } else {
      writeContract(params as any);
    }
  };

  return {
    write,
    isPending: supportsAtomicBatch ? isSponsoredPending : isStandardPending,
    isSuccess: supportsAtomicBatch ? isSponsoredSuccess : isStandardSuccess,
    isError: supportsAtomicBatch ? isSponsoredError : isStandardError,
    isSponsored: supportsAtomicBatch,
  };
}
