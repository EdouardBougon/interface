import { useRecentConnectorId } from 'components/Web3Provider/constants'
import { useConnect } from 'hooks/useConnect'
import { useCallback, useMemo } from 'react'
import { CONNECTION_PROVIDER_IDS } from 'uniswap/src/constants/web3'
import { isMobileWeb } from 'utilities/src/platform'
import { Connector } from 'wagmi'

type ConnectorID = (typeof CONNECTION_PROVIDER_IDS)[keyof typeof CONNECTION_PROVIDER_IDS]

const SHOULD_THROW = { shouldThrow: true } as const

function getConnectorWithId(
  connectors: readonly Connector[],
  id: ConnectorID,
  options: { shouldThrow: true },
): Connector
function getConnectorWithId(connectors: readonly Connector[], id: ConnectorID): Connector | undefined
function getConnectorWithId(
  connectors: readonly Connector[],
  id: ConnectorID,
  options?: { shouldThrow: true },
): Connector | undefined {
  const connector = connectors.find((c) => c.id === id)
  if (!connector && options?.shouldThrow) {
    throw new Error(`Expected connector ${id} missing from wagmi context.`)
  }
  return connector
}

/** Returns a wagmi `Connector` with the given id. If `shouldThrow` is passed, an error will be thrown if the connector is not found. */
export function useConnectorWithId(id: ConnectorID, options: { shouldThrow: true }): Connector
export function useConnectorWithId(id: ConnectorID): Connector | undefined
export function useConnectorWithId(id: ConnectorID, options?: { shouldThrow: true }): Connector | undefined {
  const { connectors } = useConnect()
  return useMemo(
    () => (options?.shouldThrow ? getConnectorWithId(connectors, id, options) : getConnectorWithId(connectors, id)),
    [connectors, id, options],
  )
}

function getInjectedConnectors(connectors: readonly Connector[]) {
  const injectedConnectors = connectors.filter((c) => {
    // Special-case: Ignore the Uniswap Extension injection here if it's being displayed separately.
    if (c.id === CONNECTION_PROVIDER_IDS.UNISWAP_EXTENSION_RDNS) {
      return false
    }

    return (
      c.type === CONNECTION_PROVIDER_IDS.INJECTED_CONNECTOR_TYPE &&
      c.id !== CONNECTION_PROVIDER_IDS.INJECTED_CONNECTOR_ID
    )
  })

  // Special-case: Return deprecated window.ethereum connector when no eip6963 injectors are present.
  if (!injectedConnectors.length && Boolean(window.ethereum) && !window.ethereum?.isMetaMask) {
    const defaultInjected = getConnectorWithId(connectors, CONNECTION_PROVIDER_IDS.INJECTED_CONNECTOR_ID, {
      shouldThrow: true,
    })
    return { injectedConnectors: [defaultInjected] }
  }

  return { injectedConnectors }
}

/**
 * These connectors do not include Uniswap Wallets because those are
 * handled separately. See <UniswapWalletOptions />
 */
type InjectableConnector = Connector & { isInjected?: boolean }
export function useOrderedConnections(): InjectableConnector[] {
  const { connectors } = useConnect()
  const recentConnectorId = useRecentConnectorId()

  const sortByRecent = useCallback(
    (a: Connector, b: Connector) => {
      if (a.id === recentConnectorId) {
        return -1
      } else if (b.id === recentConnectorId) {
        return 1
      } else {
        return 0
      }
    },
    [recentConnectorId],
  )

  return useMemo(() => {
    const { injectedConnectors } = getInjectedConnectors(connectors)

    const metaMaskConnector = getConnectorWithId(connectors, CONNECTION_PROVIDER_IDS.METAMASK_SDK_ID, SHOULD_THROW)
    const coinbaseSdkConnector = getConnectorWithId(
      connectors,
      CONNECTION_PROVIDER_IDS.COINBASE_SDK_CONNECTOR_ID,
      SHOULD_THROW,
    )
    const walletConnectConnector = getConnectorWithId(
      connectors,
      CONNECTION_PROVIDER_IDS.WALLET_CONNECT_CONNECTOR_ID,
      SHOULD_THROW,
    )
    if (!coinbaseSdkConnector || !walletConnectConnector || !metaMaskConnector) {
      throw new Error('Expected connector(s) missing from wagmi context.')
    }

    // Special-case: Only display the injected connector for in-wallet browsers.
    if (isMobileWeb && injectedConnectors.length === 1) {
      return injectedConnectors
    }

    const orderedConnectors: InjectableConnector[] = []

    // Injected connectors should appear next in the list, as the user intentionally installed/uses them.
    orderedConnectors.push(...injectedConnectors)

    // MetaMask, WalletConnect and Coinbase are added last in the list.
    orderedConnectors.push(metaMaskConnector)
    orderedConnectors.push(coinbaseSdkConnector)
    orderedConnectors.push(walletConnectConnector)

    // Place the most recent connector at the top of the list.
    orderedConnectors.sort(sortByRecent)
    return orderedConnectors
  }, [connectors, sortByRecent])
}

export enum ExtensionRequestMethods {
  OPEN_SIDEBAR = 'uniswap_openSidebar',
}

const ExtensionRequestArguments = {
  [ExtensionRequestMethods.OPEN_SIDEBAR]: ['Tokens', 'Activity'],
} as const

export function useUniswapExtensionConnector() {
  const connector = useConnectorWithId(CONNECTION_PROVIDER_IDS.UNISWAP_EXTENSION_RDNS)
  const extensionRequest = useCallback(
    async <
      Type extends keyof typeof ExtensionRequestArguments,
      Key extends (typeof ExtensionRequestArguments)[Type][number],
    >(
      method: Type,
      arg: Key,
    ) => {
      const provider = (await connector?.getProvider()) as {
        request?: (params: { method: Type; params: Key[] }) => Promise<void>
      }
      if (!provider.request) {
        return
      }

      await provider.request({
        method,
        params: [arg],
      })
    },
    [connector],
  )

  return useMemo(() => {
    return connector ? { ...connector, extensionRequest } : undefined
  }, [connector, extensionRequest])
}
