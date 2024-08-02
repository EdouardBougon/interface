import { QueryClient } from '@tanstack/react-query'
import { WC_PARAMS, uniswapWalletConnect } from 'components/Web3Provider/walletConnect'
import { UNISWAP_LOGO } from 'ui/src/assets'
import { UNIVERSE_CHAIN_INFO } from 'uniswap/src/constants/chains'
import { UniverseChainId, WEB_SUPPORTED_CHAIN_IDS } from 'uniswap/src/types/chains'
import { createClient } from 'viem'
import { createConfig, http } from 'wagmi'
import { connect } from 'wagmi/actions'
import { coinbaseWallet, metaMask, safe, walletConnect } from 'wagmi/connectors'
import { defaultInjected } from 'components/Web3Provider/defaultInjected'

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

export const wagmiConfig = createConfig({
  chains: [
    UNIVERSE_CHAIN_INFO[UniverseChainId.Mainnet],
    ...WEB_SUPPORTED_CHAIN_IDS.map((chainId) => UNIVERSE_CHAIN_INFO[chainId]),
  ],
  connectors: [
    metaMask({
      extensionOnly: true,
      infuraAPIKey: config.infuraKey,
    }),
    defaultInjected(),
    walletConnect(WC_PARAMS),
    uniswapWalletConnect(),
    coinbaseWallet({
      appName: 'Uniswap',
      appLogoUrl: UNISWAP_LOGO,
      reloadOnDisconnect: false,
      enableMobileWalletLink: true,
    }),
    safe(),
  ],
  client({ chain }) {
    return createClient({
      chain,
      batch: { multicall: true },
      pollingInterval: 12_000,
      transport: http(chain.rpcUrls.appOnly.http[0]),
    })
  },
})

export const queryClient = new QueryClient()

// Automatically connect if running in Cypress environment
if ((window as any).Cypress?.eagerlyConnect) {
  connect(wagmiConfig, { connector: defaultInjected() })
}
