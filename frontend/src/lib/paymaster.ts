import { polkadotHubTestnet } from "./wagmi";

const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

export const paymasterCapabilities = paymasterUrl
  ? {
      [polkadotHubTestnet.id]: {
        paymasterService: {
          url: paymasterUrl,
        },
      },
    }
  : undefined;
