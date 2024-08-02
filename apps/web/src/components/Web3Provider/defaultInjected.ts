import { createConnector } from 'wagmi'
import INJECTED_LIGHT_ICON from 'assets/wallets/browser-wallet-light.svg'
import { injected } from 'wagmi/connectors'

export function defaultInjected() {
  return createConnector((config) => {
    const injectedConnector = injected()(config)

    return {
      ...injectedConnector,
      get icon() {
        return INJECTED_LIGHT_ICON
      },
      get name() {
        return 'Browser Wallet'
      },
    }
  })
}
