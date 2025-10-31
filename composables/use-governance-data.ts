import { formatUnits } from 'viem'
import { veLikeAddress } from '~/composables/use-ve-like-contract'
import { LIKE_TOKEN_DECIMALS } from '~/composables/use-likecoin-contract'

const SECONDS_PER_DAY = 86400n

export function useGovernanceData(walletAddress: string | Ref<string>) {
  const {
    balanceOf: getVeLikeBalance,
    totalSupply: getVeLikeTotalSupply,
    getCurrentRewardContract,
    convertToAssets,
    deposit,
  } = useVeLikeContract()
  const { approve: approveLikeCoin } = useLikeCoinContract()

  const rewardContractAddress = ref<string | null>(null)
  const {
    getClaimedReward,
    getPendingReward,
    getCurrentCondition,
  } = useVeLikeRewardContract(rewardContractAddress)

  const veLikeBalance = ref(0n)
  const likeStakedBalance = ref(0n)
  const pendingReward = ref(0n)
  const claimedReward = ref(0n)
  const lockTime = ref(0n)
  const currentCondition = ref<{
    startTime: bigint
    endTime: bigint
    rewardAmount: bigint
    rewardIndex: bigint
  } | null>(null)
  const totalSupplyValue = ref(0n)

  const formattedVeLikeBalance = computed(() => {
    return Number(formatUnits(veLikeBalance.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedLikeStakedBalance = computed(() => {
    return Number(formatUnits(likeStakedBalance.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedPendingReward = computed(() => {
    return Number(formatUnits(pendingReward.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedClaimedReward = computed(() => {
    return Number(formatUnits(claimedReward.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const totalVotingPower = computed(() => {
    const total = veLikeBalance.value
    return Number(formatUnits(total, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const estimatedRewardPerDay = computed(() => {
    if (!currentCondition.value || veLikeBalance.value === 0n || totalSupplyValue.value === 0n) {
      return '0.00'
    }

    const { startTime, endTime, rewardAmount } = currentCondition.value

    // Avoid division by zero
    if (rewardAmount === 0n || endTime <= startTime) {
      return '0.00'
    }

    try {
      const timeDuration = endTime - startTime
      // Perform calculation with bigint, then convert to formatted string
      // timeUnit * balanceOf(account) * rewardAmount / totalSupply / (endTime - startTime)
      // timeUnit = 86400 (seconds per day)
      const numerator = SECONDS_PER_DAY * veLikeBalance.value * rewardAmount
      const denominator = totalSupplyValue.value * timeDuration * (BigInt(10) ** BigInt(LIKE_TOKEN_DECIMALS))

      // Convert to number for formatting
      const estimatedValue = Number(numerator) / Number(denominator)

      return estimatedValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })
    }
    catch (err) {
      console.error('Error calculating estimated reward per day:', err)
      return '0.00'
    }
  })

  async function loadGovernanceData() {
    if (!rewardContractAddress.value) {
      rewardContractAddress.value = await getCurrentRewardContract()
    }

    if (!toValue(walletAddress)) {
      return
    }

    const address = toValue(walletAddress) as `0x${string}`

    // Load all governance data in parallel
    const [veLikeBalanceResult, pendingRewardResult, claimedRewardResult, conditionResult, totalSupplyResult] = await Promise.all([
      getVeLikeBalance(address),
      getPendingReward(address),
      getClaimedReward(address),
      getCurrentCondition(),
      getVeLikeTotalSupply(),
    ])

    veLikeBalance.value = veLikeBalanceResult
    // Convert veLIKE shares to underlying LIKE amount
    const likeStakedAmount = await convertToAssets(veLikeBalanceResult)
    likeStakedBalance.value = likeStakedAmount
    pendingReward.value = pendingRewardResult
    claimedReward.value = claimedRewardResult
    currentCondition.value = conditionResult as {
      startTime: bigint
      endTime: bigint
      rewardAmount: bigint
      rewardIndex: bigint
    }
    totalSupplyValue.value = totalSupplyResult
  }

  async function approveAndDeposit(amount: bigint, receiver: string) {
    // Approve LIKE token for veLIKE contract
    await approveLikeCoin(veLikeAddress, amount)
    await deposit(amount, receiver)
  }

  // Load data when the composable is mounted
  watch(
    () => walletAddress,
    async (newAddress) => {
      if (newAddress) {
        await loadGovernanceData()
      }
    },
    { immediate: true },
  )

  return {
    // Raw values
    veLikeBalance,
    likeStakedBalance,
    pendingReward,
    claimedReward,
    lockTime,
    estimatedRewardPerDay: readonly(estimatedRewardPerDay),
    // Formatted values
    formattedVeLikeBalance,
    formattedLikeStakedBalance,
    formattedPendingReward,
    formattedClaimedReward,
    totalVotingPower,
    loadGovernanceData,
    approveAndDeposit,
  }
}
