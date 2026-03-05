import { baseSepolia } from "viem/chains";

const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

export const paymasterCapabilities = paymasterUrl
  ? {
      [baseSepolia.id]: {
        paymasterService: {
          url: paymasterUrl,
        },
      },
    }
  : undefined;
