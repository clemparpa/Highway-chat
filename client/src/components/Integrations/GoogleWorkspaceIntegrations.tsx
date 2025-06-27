import React from 'react';
import useLocalize from '~/hooks/useLocalize';
import { 
  GoogleGMailIcon, 
  GoogleDriveIcon, 
  GoogleAgendaIcon,
  GoogleChatIcon,
  GoogleDocsIcon,
  GoogleSheetsIcon
} from '~/components/svg';
import { IntegrationCard } from '~/components/Integrations/integrationCard';
import { 
  useIntegrationEnabledQuery, 
  useRevokeIntegrationMutation, 
  useInitIntegrationAuthMutation
} from 'librechat-data-provider/react-query';
import { NotificationSeverity } from '~/common';
import { Button } from '~/components/ui';
import { useToastContext } from '~/Providers/ToastContext';

const integrations = [
  {
    provider: 'google-workspace',
    service: 'gmail',
    icon: GoogleGMailIcon,
    titleKey: 'com_integrations_gmail_title',
    descriptionKey: 'com_integrations_gmail_description',
  },
  {
    provider: 'google-workspace',
    service: 'drive',
    icon: GoogleDriveIcon,
    titleKey: 'com_integrations_gdrive_title',
    descriptionKey: 'com_integrations_gdrive_description',
  },
  {
    provider: 'google-workspace',
    service: 'calendar',
    icon: GoogleAgendaIcon,
    titleKey: 'com_integrations_gcalendar_title',
    descriptionKey: 'com_integrations_gcalendar_description',
  },
  {
    provider: "google-workspace",
    service: "chat",
    icon: GoogleChatIcon,
    titleKey: "com_integrations_gchat_title",
    descriptionKey: "com_integrations_gchat_description",
  },
  {
    provider: "google-workspace",
    service: "docs",
    icon: GoogleDocsIcon,
    titleKey: "com_integrations_gdocs_title",
    descriptionKey: "com_integrations_gdocs_description",
  },
  {
    provider: "google-workspace",
    service: "sheets",
    icon: GoogleSheetsIcon,
    titleKey: "com_integrations_gsheets_title",
    descriptionKey: "com_integrations_gsheets_description",
  },
];

const PROVIDER = 'google-workspace';

const GoogleWorkspaceIntegrations = () => {
  const localize = useLocalize();
  const { showToast } = useToastContext();

  // Queries
  const { 
    data: integrationData, 
    isLoading: isLoadingEnabled, 
    error: enabledError 
  } = useIntegrationEnabledQuery(PROVIDER);

  // Mutations
  const revokeIntegrationMutation = useRevokeIntegrationMutation({
    onSuccess: (data) => {
      if (data.accessTokenDeleted > 0 || data.refreshTokenDeleted > 0) {
        showToast({
          message: localize("com_integrations_revokation_suceeded"),
          severity: NotificationSeverity.SUCCESS,
        });
      }
    },
    onError: (error) => {
      console.error('Error revoking integration:', error);
      showToast({
        message: localize("com_integrations_revokation_failed"),
        severity: NotificationSeverity.ERROR,
      });
    },
  });

  const initIntegrationAuthMutation = useInitIntegrationAuthMutation({
    onSuccess: (data) => {
      // Redirect to OAuth URL
      window.location.href = data.integrationURL;
    },
    onError: (error) => {
       showToast({
        message: localize("com_integrations_init_failed"),
        severity: NotificationSeverity.ERROR,
      });
    },
  });

  // Handlers
  const handleRevoke = () => {
    revokeIntegrationMutation.mutate({ provider: PROVIDER });
  };

  const handleConnect = (service: string) => {
    return () => {
      initIntegrationAuthMutation.mutate({ 
        provider: PROVIDER, 
        service 
      });
    };
  };

  // Loading state
  if (isLoadingEnabled) {
    return (
      <div className="p-12">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-primary"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (enabledError) {
    return (
      <div className="p-12">
        <div className="text-center text-red-500">
          <p>{localize('com_integrations_load_error')}</p>
        </div>
      </div>
    );
  }

  const enabledServices = integrationData?.enabled || [];
  const isRevoking = revokeIntegrationMutation.isLoading;
  const isConnecting = initIntegrationAuthMutation.isLoading;

  return (
    <div className="p-12">
      <div className="flex justify-between items-baseline">
        <h1 className="text-3xl font-bold mb-10 text-text-primary">
          {localize('com_integrations_google_workspace_title')}
        </h1>
        <Button 
          variant="destructive" 
          onClick={handleRevoke}
          disabled={isRevoking || enabledServices.length === 0}
        >
          {isRevoking 
            ? localize('com_integrations_disconnecting_button') 
            : localize('com_integrations_disconnect_button')
          }
        </Button>
      </div>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={`${integration.provider}_${integration.service}`}
            icon={integration.icon}
            titleKey={integration.titleKey}
            descriptionKey={integration.descriptionKey}
            handleConnect={handleConnect(integration.service)}
            status={enabledServices.includes(integration.service)}
            disabled={isConnecting}
            loading={isConnecting}
          />
        ))}
      </div>
    </div>
  );
};

export default GoogleWorkspaceIntegrations;
