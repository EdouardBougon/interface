/* eslint-disable no-restricted-imports */
import { PartialMessage } from '@bufbuild/protobuf'
import { ConnectError } from '@connectrpc/connect'
import { useQuery } from '@connectrpc/connect-query'
import { UseQueryResult } from '@tanstack/react-query'
import { getPair } from '@uniswap/client-pools/dist/pools/v1/api-PoolsService_connectquery'
import { GetPairRequest, GetPairResponse } from '@uniswap/client-pools/dist/pools/v1/api_pb'
import { uniswapGetTransport } from 'uniswap/src/data/rest/base'

export function useGetPair(
  input?: PartialMessage<GetPairRequest>,
  enabled = true,
): UseQueryResult<GetPairResponse, ConnectError> {
  return useQuery(getPair, input, { transport: uniswapGetTransport, enabled, retry: false })
}