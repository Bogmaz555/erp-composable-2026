import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Customer {
  id: string;
  name: string;
  nip: string | null;
  email: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  opportunityId: string;
}

export interface DocumentItem {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  currency: string;
  type: string;
}

export interface BOMItem {
  id: string;
  quantity: number;
  price: number;
  catalogItem: CatalogItem;
}

export interface Opportunity {
  id: string;
  title: string;
  value: number;
  tkw: number;
  currency: string;
  status: 'NEW' | 'WAITING_VISIT' | 'TECH_DRAFT' | 'QUOTING' | 'OFFER_SENT' | 'CLIENT_SIDE' | 'NEGOTIATION' | 'ACCEPTED' | string;
  customerId: string;
  customer: Customer;
  activities?: Activity[];
  documents?: DocumentItem[];
  bomItems?: BOMItem[];
  createdAt: string;
}

export function useOpportunities() {
  return useQuery<Opportunity[]>({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await fetch('/api/crm');
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      return res.json();
    },
  });
}

export function useCatalog() {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog'],
    queryFn: async () => {
      const res = await fetch('/api/crm/catalog');
      if (!res.ok) throw new Error('Failed to fetch catalog');
      return res.json();
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newStage }: { id: string; newStage: string }) => {
      const res = await fetch('/api/crm/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStage }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      return res.json();
    },
    // Optimistic UI update logic
    onMutate: async ({ id, newStage }) => {
      await queryClient.cancelQueries({ queryKey: ['opportunities'] });
      const previousOpportunities = queryClient.getQueryData<Opportunity[]>(['opportunities']);
      
      if (previousOpportunities) {
        queryClient.setQueryData<Opportunity[]>(
          ['opportunities'],
          previousOpportunities.map((opp) => 
            opp.id === id ? { ...opp, status: newStage } : opp
          )
        );
      }
      return { previousOpportunities };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousOpportunities) {
        queryClient.setQueryData(['opportunities'], context.previousOpportunities);
      }
    },
    onSettled: () => {
      // Invalidate and refetch behind the scenes to verify and fetch newest data
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}
