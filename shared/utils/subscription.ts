// Sessions predating Civic carry no tier field; an active Plus subscriber
// reads as 'plus'. Non-subscribers have no tier at all.
export function getEffectiveLikerPlusTier(
  user?: { isLikerPlus?: boolean, likerPlusTier?: LikerPlusTier } | null,
): LikerPlusTier | undefined {
  if (!user?.isLikerPlus) return undefined
  return user.likerPlusTier || 'plus'
}
