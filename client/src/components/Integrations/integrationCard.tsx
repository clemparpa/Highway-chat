import React from 'react';
import useLocalize from '~/hooks/useLocalize';
import { Button } from '~/components/ui';

export type IntegrationCardProps = {
  icon: React.ComponentType<{ size: number }>;
  titleKey: string;
  descriptionKey: string;
  status: boolean;
  handleConnect: () => void;
  disabled?: boolean;
  loading?: boolean;
}


export const IntegrationCard = ({icon: Icon, titleKey, descriptionKey, status, handleConnect, disabled = false, loading = false }: IntegrationCardProps) => {
  const localize = useLocalize();
 
  const onConnect = async () => handleConnect(); 

  return (
      <div
      className="rounded-lg border border-border-medium bg-surface-tertiary-alt p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col items-center justify-between h-56">
        <div className='flex gap-2 items-center w-full'>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary-alt">
            <Icon size={24} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">
              {localize(titleKey)}
          </h3>
        </div>
        
        <div className="text-center">
          <p className="mt-2 text-sm text-text-secondary">
            {localize(descriptionKey)}
          </p>
        </div>
        
        <div className='flex gap-2 w-full'>
          {
            status
            ?
            <Button variant="ghost" disabled={true}>
              {localize("com_integrations_connected_button")}
            </Button>
            :
            <Button 
              variant="secondary" 
              onClick={onConnect}
              disabled={disabled || loading}
            >
              {
                loading ? 
                localize("com_integrations_connecting_button") : 
                localize("com_integrations_connect_button")
              }
            </Button>  
        }
        </div>
      </div>
    </div>
    );
}
