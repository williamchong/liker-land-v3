declare type SubscriptionPlan = 'monthly' | 'yearly'
declare type LikerPlusStatus = 'month' | 'year'
// 'shared' means Plus granted via a Civic subscriber's shared member seat.
declare type LikerPlusProvider = 'stripe' | 'revenuecat' | 'shared'
// Civic is a superset of Plus: isLikerPlus stays true, tier discriminates.
declare type LikerPlusTier = 'plus' | 'civic'
