import { useWriteContract } from '@wagmi/vue'
import likeCoinErc20Abi from '~/contracts/likecoin.json'

const likeCoinErc20Address = '0x1EE5DD1794C28F559f94d2cc642BaE62dC3be5cf'

export function useLikeStaking() {
  const { writeContractAsync } = useWriteContract()
  const {
    getLikeStakePositionInfo,
    getWalletLikeStakePositionIdsOfNFTClassId,
    getWalletLikeStakePositionIds,
  } = useLikeStakePositionContract()
  const {
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
    stakeToNFTClass: rawStakeToNFTClass,
    unstakeFromStakePosition,
    claimRewardsFromStakePosition,
    claimWalletRewards,
  } = useLikeCollectiveContract()

  async function getAllLikeStakePositionInfosOfOwner(owner: string) {
    const tokenIds = await getWalletLikeStakePositionIds(owner)
    const positionInfos = await Promise.all(
      tokenIds.map(tokenId => getLikeStakePositionInfo(Number(tokenId))),
    )
    return positionInfos
  }

  async function getAllLikeStakePositionInfosOfNFTClassByOwner(owner: string, nftClassId: string) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(owner, nftClassId)
    const positionInfos = await Promise.all(
      tokenIds.map(tokenId => getLikeStakePositionInfo(Number(tokenId))),
    )
    return positionInfos
  }

  async function claimWalletRewardsOfNFTClass(wallet: string, nftClassId: string) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    await Promise.all(tokenIds.map(tokenId => claimRewardsFromStakePosition(tokenId)))
  }

  async function stakeToNFTClass(nftClassId: string, amount: bigint) {
    await writeContractAsync({
      address: likeCoinErc20Address,
      abi: likeCoinErc20Abi,
      functionName: 'approve',
      args: [likeCollectiveAddress, amount],
    })
    await rawStakeToNFTClass(nftClassId, amount)
  }

  async function unstakeFromNFTClass(wallet: string, nftClassId: string) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    await Promise.all(tokenIds.map(tokenId => unstakeFromStakePosition(tokenId)))
  }

  async function mergeWalletStakePositionsOfNFTClass(wallet: string, nftClassId: string) {
    const positionInfos = await getAllLikeStakePositionInfosOfNFTClassByOwner(wallet, nftClassId)
    const totalStakedAmount = positionInfos.reduce((acc, info) => acc + info.stakedAmount, BigInt(0))
    await unstakeFromNFTClass(wallet, nftClassId)
    await stakeToNFTClass(nftClassId, totalStakedAmount)
  }

  return {
    stakeToNFTClass,
    unstakeFromNFTClass,
    claimWalletRewardsOfNFTClass,
    claimWalletRewards,
    getAllLikeStakePositionInfosOfOwner,
    getAllLikeStakePositionInfosOfNFTClassByOwner,
    mergeWalletStakePositionsOfNFTClass,
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
  }
}
