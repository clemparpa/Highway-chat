import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '~/components/ui';
import { useLocalize } from '~/hooks';

type IntegrationButtonProps = {
  id: string;
  labelKey: string;
  icons: React.ComponentType[];
  url: string;
}

const IntegrationsButton = memo(({ id, labelKey, icons, url }: IntegrationButtonProps) => {
  const localize = useLocalize();  
  const navigate = useNavigate();  

  const handleClick = () => {
    navigate(url)
  }

  return (
    <Button
      id={id}
      className="w-full flex items-center justify-start"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      > 
       <div className="flex items-center space-x-1">
       {icons.map((Icon, index) => <Icon key={index} className="h-5 w-5" />)}
       </div>
       <span className="font-normal text-text-primary">{localize(labelKey)}</span>
      </Button>
  )
  }
);

IntegrationsButton.displayName = 'IntegrationsButton';
export default IntegrationsButton;