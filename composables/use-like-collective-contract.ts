import { readContract } from '@wagmi/core'
import { useWriteContract } from '@wagmi/vue'

import likeCollectiveABI from '~/contracts/like-collective.json'

export function useLikeCollectiveContract() {
  const { writeContractAsync } = useWriteContract()
  const { $wagmiConfig } = useNuxtApp()
  // TODO: Update address when deployed
  const likeCollectiveAddress = '0x6b65396685496035ce0b03cbec9b9963793b08a9'

  async function getWalletPendingRewardsOfNFTClass(wallet: string, nftClassId: string) {
    const rewards = await readContract($wagmiConfig, {
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'getPendingRewards',
      args: [wallet, nftClassId],
    })
    return rewards as bigint
  }

  async function getWalletStakeOfNFTClass(wallet: string, nftClassId: string) {
    const stake = await readContract($wagmiConfig, {
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'getStakeForUser',
      args: [wallet, nftClassId],
    })
    return stake as bigint
  }

  async function getTotalStakeOfNFTClass(nftClassId: string) {
    const totalStake = await readContract($wagmiConfig, {
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'getTotalStake',
      args: [nftClassId],
    })
    return totalStake as bigint
  }

  async function stakeToNFTClass(nftClassId: string, amount: bigint) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'stake',
      args: [nftClassId, amount],
    })
  }

  async function unstakeFromNFTClass(nftClassId: string, amount: bigint) {
    const { writeContractAsync } = useWriteContract()
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'unstake',
      args: [nftClassId, amount],
    })
  }

  async function claimAllRewards() {
    const { writeContractAsync } = useWriteContract()
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'claimAllRewards',
      args: [],
    })
  }

  return {
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
    stakeToNFTClass,
    unstakeFromNFTClass,
    claimAllRewards,
  }
}
