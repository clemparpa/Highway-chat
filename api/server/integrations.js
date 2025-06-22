const passport = require('passport');
const { integrationsGoogleWorkspace } = require ("~/strategies")
const { logger } = require('~/config');

const configureIntegrations = async (app) => {
    logger.info('Configuring integrations...'); 
    passport.use("integrations-google-workspace", integrationsGoogleWorkspace())
    
  };
  
module.exports = configureIntegrations;
  