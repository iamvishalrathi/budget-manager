import useSWR from 'swr';
import { IAccount } from '@/models/Account';
import { ITransaction } from '@/models/Transaction';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<IAccount[]>('/api/accounts', fetcher);
  
  return {
    accounts: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAccount(id: string) {
  const { data, error, isLoading, mutate } = useSWR<IAccount>(
    id ? `/api/accounts/${id}` : null,
    fetcher
  );
  
  return {
    account: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useTransactions(params?: {
  accountId?: string;
  type?: string;
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.accountId) queryParams.set('accountId', params.accountId);
  if (params?.type) queryParams.set('type', params.type);
  if (params?.category) queryParams.set('category', params.category);
  if (params?.from) queryParams.set('from', params.from);
  if (params?.to) queryParams.set('to', params.to);
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.cursor) queryParams.set('cursor', params.cursor);
  
  const url = `/api/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR<{
    transactions: ITransaction[];
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
    };
  }>(url, fetcher);
  
  return {
    transactions: data?.transactions,
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAnalytics(params?: {
  granularity?: string;
  from?: string;
  to?: string;
  accountId?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.granularity) queryParams.set('granularity', params.granularity);
  if (params?.from) queryParams.set('from', params.from);
  if (params?.to) queryParams.set('to', params.to);
  if (params?.accountId) queryParams.set('accountId', params.accountId);
  
  const url = `/api/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);
  
  return {
    analytics: data,
    isLoading,
    isError: error,
    mutate,
  };
}
