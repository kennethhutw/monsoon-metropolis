// wagmi config for real-mode wallet connections (Monad Testnet).
// No RainbowKit — @rainbow-me/rainbowkit@2.2.11's peer dep only supports
// wagmi ^2.9.0, and this project is on wagmi v3. A custom connect button
// (components/shared/ConnectWalletButton.tsx) using wagmi's own `injected`
// connector avoids the mismatch and matches the M3 design tokens directly.

import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { monadTestnet } from './contracts/config'

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
