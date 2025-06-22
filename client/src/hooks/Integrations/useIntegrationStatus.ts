import { useState, useEffect, useCallback } from 'react';
import { dataService, TIntegrationStatusResponse, request, endpoints } from 'librechat-data-provider';

export const useIntegrationStatus = (provider: string, service: string) => {
  const [status, setStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result: TIntegrationStatusResponse = await request.get(`http://localhost:3080/${endpoints.integrationStatus(service, provider)}`)
      // await dataService.integrationStatus({provider, service})
      setStatus(result.status);
    } catch (err) {
      console.error('Erreur vérification intégration:', err);
      setError('Impossible de vérifier l\'intégration');
      setStatus(false);
    } finally {
      setLoading(false);
    }
  }, [provider, service]);

  useEffect(() => {
    if (provider) {
      checkStatus();
    }
  }, [provider, service]);

  const refetch = checkStatus;

  return { status, loading, error, refetch};
};