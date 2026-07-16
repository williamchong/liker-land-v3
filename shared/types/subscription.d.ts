declare type SubscriptionPlan = 'monthly' | 'yearly'
declare type LikerPlusStatus = 'month' | 'year'
declare type LikerPlusProvider = 'stripe' | 'revenuecat'
// Civic is a superset of Plus: isLikerPlus stays true, tier discriminates.
declare type LikerPlusTier = 'plus' | 'civic'
