// Businesses are shared with Wallet (ADR 0004); Money reads them through this one door.
export {
  type BusinessDraft,
  type BusinessRow,
  businessesQuery,
  useArchiveBusiness,
  useBusinesses,
  useEnsureBusiness,
  useSaveBusiness,
} from '@/hooks/use-businesses';
