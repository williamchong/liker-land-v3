import { http, createConfig } from '@wagmi/vue'
import { optimism, optimismSepolia } from '@wagmi/vue/chains'
import { injected, metaMask, walletConnect } from '@wagmi/vue/connectors'
import { dedicatedWalletConnector } from '@likecoin/wagmi-connector'

export function createWagmiConfig({
  apiKey,
  rpcURL = '',
  chainId,
  customLogoURL,
  walletConnectProjectId,
  isServer = false,
}: {
  apiKey: string
  rpcURL?: string
  chainId?: number
  customLogoURL?: string
  walletConnectProjectId?: string
  isServer?: boolean
}) {
  return createConfig({
    chains: [optimismSepolia, optimism],
    connectors: [
      injected(),
      metaMask(),
      ...(walletConnectProjectId
        ? [walletConnect({
            projectId: walletConnectProjectId,
            metadata: {
              name: '3ook.com',
              description: '3ook.com is an AI reading companion coupled with a decentralized bookstore on web3',
              url: 'https://3ook.com',
              icons: [customLogoURL || 'https://3ook.com/favicon-32x32.png'],
            },
          })]
        : []),
      // NOTE: @magiclabs/wagmi-connector is not compatible with SSR
      // https://github.com/magiclabs/wagmi-magic-connector/issues/42#issuecomment-2771613002
      ...(isServer
        ? []
        : [dedicatedWalletConnector({
            chains: [optimismSepolia, optimism],
            options: {
              apiKey,
              accentColor: '#131313',
              customHeaderText: '3ook.com',
              customLogo: customLogoURL,
              isDarkMode: false,
              magicSdkConfiguration: {
                deferPreload: true,
                network: {
                  rpcUrl: rpcURL,
                  chainId,
                },
              },
            },
          })]),
    ],
    ssr: true,
    transports: {
      [optimism.id]: http(),
      [optimismSepolia.id]: http(),
    },
  })
}

declare module '@wagmi/vue' {
  interface Register {
    config: ReturnType<typeof createWagmiConfig>
  }
}
