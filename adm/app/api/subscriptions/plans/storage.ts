// Shared storage for subscription plans
// In production, this should be replaced with database queries

export interface Plan {
  id: string
  name: string
  price: number
  billingCycle: string
  features: {
    maxAccounts: number
    maxAutomationRules: number
    maxCampaigns: number
    support: string
  }
  description: string
  isActive: boolean
}

export let SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billingCycle: 'monthly',
    features: {
      maxAccounts: 1,
      maxAutomationRules: 3,
      maxCampaigns: 10,
      support: 'community',
    },
    description: 'Perfect for getting started',
    isActive: true,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 100000,
    billingCycle: 'monthly',
    features: {
      maxAccounts: 3,
      maxAutomationRules: 20,
      maxCampaigns: 100,
      support: 'email',
    },
    description: 'For small businesses',
    isActive: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 300000,
    billingCycle: 'monthly',
    features: {
      maxAccounts: 10,
      maxAutomationRules: -1, // unlimited
      maxCampaigns: -1, // unlimited
      support: 'priority',
    },
    description: 'For growing businesses',
    isActive: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1000000,
    billingCycle: 'monthly',
    features: {
      maxAccounts: -1, // unlimited
      maxAutomationRules: -1, // unlimited
      maxCampaigns: -1, // unlimited
      support: 'dedicated',
    },
    description: 'For large organizations',
    isActive: true,
  },
]

