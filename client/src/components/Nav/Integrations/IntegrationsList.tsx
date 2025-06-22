import React, { memo } from 'react';
import { useLocalize } from '~/hooks';
import IntegrationsButton from "./IntegrationButton";
import { GoogleAgendaIcon, GoogleDriveIcon, GoogleGMailIcon } from '~/components/svg';

const IntegrationsList = memo(() => {
  const localize = useLocalize();

  const integrations = [
    {
      id: 'google-workspace',
      labelKey: 'Google Workspace',
      icons: [GoogleGMailIcon, GoogleDriveIcon, GoogleAgendaIcon],
      url: '/integrations/google-workspace',
      enabled: true,      
    },
    // Vous pouvez facilement ajouter d'autres intégrations ici
  ];

  return (
    <div className="my-3">
      <div className="mb-2 px-2.5">
        <h3 className="text-xs font-medium text-text-secondary tracking-wider">
            {localize('com_nav_integrations')}
        </h3>
      </div>
      <div className="space-y-1">
        {integrations.map((integration) => (
          <IntegrationsButton key={integration.id} {...integration} />
        ))}
      </div>
    </div>
  );
});

IntegrationsList.displayName = 'IntegrationsList';

export default IntegrationsList;
