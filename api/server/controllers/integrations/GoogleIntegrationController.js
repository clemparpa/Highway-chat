const passport = require('passport');
const { createToken, findToken, deleteTokens, updateToken} = require('~/models')
const { getRandomValues, decryptV3, encryptV3 } = require('@librechat/api');
const { logger } = require('~/config');

const GOOGLE_SCOPES = {
    userinfo: [
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    gmail: [
      'https://www.googleapis.com/auth/gmail.readonly',  
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels'
    ],
    drive: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'      
    ],
    calendar: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    docs: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/documents.readonly'
    ],
    sheets: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    chat: [
      'https://www.googleapis.com/auth/chat.messages.readonly',
      'https://www.googleapis.com/auth/chat.messages',
      'https://www.googleapis.com/auth/chat.spaces'      
    ]    
  }

const REVERSE_GOOGLE_SCOPES = Object.fromEntries(
    Object.entries(GOOGLE_SCOPES).flatMap(([key, values]) =>
      values.map(value => [value, key])
    )
  ); 
// reverse the GOOGLE_SCOPES object to get the key from the value
const PROVIDER = "google-workspace"

const domains = {
    client: process.env.DOMAIN_CLIENT,
    server: process.env.DOMAIN_SERVER,
};

// Fonction utilitaire pour accéder aux métadonnées (gère Map et objet)
const getMetadataValue = (metadata, key) => {
  if (metadata instanceof Map) {
    return metadata.get(key);
  }
  return metadata?.[key];
};



const findAccessToken = async (userId, provider = PROVIDER) => {
  return await findToken({ 
    userId, 
    identifier: `integration-${provider}-access-token-${userId}`
  });
}

const findRefreshToken = async (userId, provider = PROVIDER) => {
  return await findToken({
    userId,
    identifier: `integration-${provider}-refresh-token-${userId}`
  });
}

const createOrUpdateAccessToken = async ({userId, token, expiresIn = null, services = null, userEmail = null}) => {
  const previousToken = await findAccessToken(userId);
  if(!!previousToken){
    return await updateToken({userId, identifier: `integration-${PROVIDER}-access-token-${userId}`}, {
      token: encryptV3(token),
      expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000),
      metadata: {
        type: "access_token",
        provider: PROVIDER,
        email: (userEmail ?? getMetadataValue(previousToken.metadata, 'email')) ?? null,
        services: (services ?? getMetadataValue(previousToken.metadata, 'services')) || []
      }
    })
  }
  return await createToken({
    userId,
    identifier: `integration-${PROVIDER}-access-token-${userId}`,
    type: `integration-${PROVIDER}-access-token`,
    token: encryptV3(token),
    expiresIn,
    metadata: {
      type: "access_token",
      provider: PROVIDER,
      email: userEmail,
      services
    }
  })
}

const createOrUpdateRefreshToken = async ({userId, token, expiresIn = null, services = null, userEmail = null}) => {
  const previousToken = await findRefreshToken(userId);
  if(!!previousToken){
    return await updateToken({userId, identifier: `integration-${PROVIDER}-refresh-token-${userId}`}, {
      token: encryptV3(token),
      expiresAt: new Date(Date.now() + (expiresIn || 3600*24*7) * 1000),
      metadata: {
        type: "refresh_token",
        provider: PROVIDER,
        email: (userEmail ?? getMetadataValue(previousToken.metadata, 'email')) ?? null,
        services: (services ?? getMetadataValue(previousToken.metadata, 'services')) || []
      }
    })
  }
  if(!userEmail || !services) {
    return null
  }

  return await createToken({
    userId,
    identifier: `integration-${PROVIDER}-refresh-token-${userId}`,
    type: `integration-${PROVIDER}-refresh-token`,
    token: encryptV3(token),
    expiresIn,
    metadata: {
      type: "refresh_token",
      provider: PROVIDER,
      email: userEmail,
      services
    }
  })
}

const refreshAccessToken = async (userId) => {
  logger.debug(`[refreshAccessToken] Refreshing access token for user ${userId}`);
  const refreshToken = await findRefreshToken(userId);
  if(!refreshToken) {
    logger.debug(`[refreshAccessToken] No refresh token found for user ${userId}`);
    return null;
  }
  if(new Date() > refreshToken.expiresAt) {
    logger.warn(`[refreshAccessToken] Refresh token expired for user ${userId}`);
    return null;
  }

  try{
    const refreshTokenValue = decryptV3(refreshToken.token);        
    const url = 'https://oauth2.googleapis.com/token';

    const params = new URLSearchParams();
    params.append('client_id', process.env.INTEGRATIONS_GOOGLE_CLIENT_ID);
    params.append('client_secret', process.env.INTEGRATIONS_GOOGLE_CLIENT_SECRET);
    params.append('refresh_token', refreshTokenValue);
    params.append('grant_type', 'refresh_token');
    const newRefreshTokenResponse = await (await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })).json();

    if (!newRefreshTokenResponse) {
      logger.error(`[refreshAccessToken] No response from Google API for user ${userId}`);
      return null;
    }

    const newAccessToken = newRefreshTokenResponse.access_token;
    const newExpiresIn = newRefreshTokenResponse.expires_in;
    const newScopes = newRefreshTokenResponse.scope.split(" ");
    const userEmail = getMetadataValue(refreshToken.metadata, 'email') ?? null;

    if (!newAccessToken || !userEmail || (newScopes.length === 0)) {
      logger.error(`[refreshAccessToken] Invalid response from Google API for user ${userId}`)
      return null;
    }
    
    const newToken = await createOrUpdateAccessToken({
      userId,
      token: newAccessToken,
      expiresIn: newExpiresIn,
      services: newScopes,
      userEmail: userEmail
    })
    if (!newToken) {
      logger.error(`[refreshAccessToken] Failed to create or update access token for user ${userId}`);
      return null;
    }
    return newToken;
  }
  catch (error) {
    logger.error(`[refreshAccessToken] Error refreshing access token for user ${userId}`, error);
    return null;
  } 
}

const findAccessTokenWithRefreshIfNeeded = async (userId) => {
  const token = await findAccessToken(userId);

  if(!token) {
    logger.debug(`[findAccessTokenWithRefreshIfNeeded] No access token found for user ${userId}. Refreshing...`);
    const newToken = await refreshAccessToken(userId)
    if(!newToken) {
      logger.debug(`[findAccessTokenWithRefreshIfNeeded] No new access token found for user ${userId}`);
      return null;
    }
    return newToken;
  }

  if(new Date() > token.expiresAt - 60000) {    
    logger.debug(`[findAccessTokenWithRefreshIfNeeded] token invalid found for user ${userId}. Refreshing...`);
    const newToken = await refreshAccessToken(userId)
    if(!newToken) {
      logger.debug(`[findAccessTokenWithRefreshIfNeeded] No new access token found for user ${userId}`);
      return null;
    }
    return newToken;
  }

  return token;
}    


const createSessionStateToken = async (userId, state, service) => {
  return await createToken({
      userId: userId,
      type: 'integration-state-token',
      identifier: `integration-${PROVIDER}-${userId}-${Date.now()}`,
      token: state,
      expiresIn: 300,
      metadata: {
        provider: PROVIDER,
        service: service,
        userId: userId,
      }
  });
}

const findSessionStateToken = async (state) => {
  logger.debug(`[retrieveSessionStateToken] Retrieving session state token`);
  const token = await findToken({
    token: state
  })
  logger.debug(
    `[retrieveSessionStateToken] Found token: ${!!token}`);
  if (!token) {
    return {};
  }
  if (new Date() > token.expiresAt) {
    await deleteTokens({ token: token.token });
    return {};
  }
  const { service, userId } = token?.metadata || {};
  const retrievedState = token.token;
  await deleteTokens({ token: token.token });    
  if (!service || !userId || !retrievedState) {
    return {};
  }

  if(state !== retrievedState) {
    logger.warn(`[retrieveSessionStateToken] State mismatch for user ${userId}. Expected: ${retrievedState}, Received: ${state}`);
    return {};
  }

  return {
    userId: userId,
    service: service,
  };
}


const errorController = async (req, res) => {
    const { reason } = req.query;
    logger.error('Error in integration OAuth:', { reason });
    
    // Rediriger vers une page d'erreur spécifique aux intégrations
    res.redirect(`${domains.client}/integrations?error=${reason || 'unknown'}`);
}


const checkEnabledController = async (req, res) => {
  try {
    logger.debug('[checkEnabledController] Checking integration status');
    
    const token = await findAccessTokenWithRefreshIfNeeded(req.user.id);
    if (!token) {
      logger.error('[checkEnabledController] Token not found after refresh');
      return res.status(200).json({ enabled : [] });
    }
    
    // Gérer le cas où metadata est une Map ou un objet
    const tokenServices = getMetadataValue(token.metadata, 'services');
    if (!tokenServices) {
      logger.warn('[checkEnabledController] Token found but no services metadata');
      return res.status(200).json({ enabled: [] });
    }

    const enabledServices = [...new Set(tokenServices.map(s => REVERSE_GOOGLE_SCOPES[s]))];
    return res.status(200).json({ enabled: enabledServices });
  } catch (error) {
    logger.error('[checkEnabledController]', error);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}


const getAccessTokenController = async (req, res) => {
    try {
        const token = await findAccessTokenWithRefreshIfNeeded(req.user.id);

        if (!token) {
            return res.status(401).json({ message: 'No access token found' });
        }
        
        // Gérer le cas où metadata est une Map ou un objet
        const email = getMetadataValue(token.metadata, 'email') || null;
        if (!email) {
            logger.warn(`[getAccessTokenController] No email found in token metadata for user ${req.user.id}`);
            return res.status(400).json({ message: 'No email found in token metadata' });
        }

        const response = {
          accessToken: decryptV3(token.token),
          email: email,
          scopes: getMetadataValue(token.metadata, 'services') || []
        }

        res.json(response);
    } catch (error) {
        logger.error('[getAccessTokenController]', error);
        return res.status(500).json({ message: 'Something went wrong.' });
    }
}


const initAuthController = async (req, res) => {
    try {
      logger.debug(`[initAuthController] Creating integration token for user ${req.user.id}`);
      const { service } = req.params;

      const token = await createToken({
        userId: req.user.id,
        type: 'integration-init',
        identifier: `integration-${PROVIDER}-${req.user.id}-${Date.now()}`,
        token: await getRandomValues(32),
        expiresIn: 300,
        metadata: {
          provider: PROVIDER,
          service: service,
          userId: req.user.id,
        }
      });
      
      const integrationURL = `${domains.server}/api/integrations/${PROVIDER}?token=${token.token}`;
      logger.debug(`[initAuthController] Integration token created for user ${req.user.id}`);
      return res.status(200).json({ integrationURL });
    } catch (error) {
      logger.error('[initAuthController]', error);
      return res.status(500).json({ message: 'Something went wrong.' });
    }
  }


const askAuthTokenController = async (req, res, next) => {
    try {
      const { token: initToken } = req.query;

      if (!initToken) {
        return res.redirect(`${domains.server}/api/integrations/error?reason=missing_token`);
      }

      const token = await findToken({
        token: initToken
      });

      if (!token) {
        return res.redirect(`${domains.server}/api/integrations/error?reason=invalid_token`);
      }

      if (new Date() > token.expiresAt) {
        await deleteTokens({ token: token.token });
        return res.redirect(`${domains.server}/api/integrations/error?reason=expired_token`);
      }      
      
      const userId = token?.metadata?.userId || token.userId;

      if (!userId) {
        return res.redirect(`${domains.server}/api/integrations/error?reason=invalid_user`);
      }

      const askedService = token?.metadata?.service;
      if (!askedService) {
        return res.redirect(`${domains.server}/api/integrations/error?reason=invalid_service`);
      }

      await deleteTokens({ token: token.token });

      logger.debug(`[askAuthTokenController] Starting OAuth ${askedService} for user ${userId}`);

      let scopes = GOOGLE_SCOPES?.[askedService] ?? null;
      if (!scopes) {
        return res.redirect(`${domains.server}/api/integrations/error?reason=invalid_service`);
      }
      scopes = [...GOOGLE_SCOPES.userinfo, ...scopes]

      const state = await getRandomValues(32)
      const stateToken = createSessionStateToken(userId, state, askedService)
      
      await passport.authenticate(`integrations-${PROVIDER}`, {
        session: false,
        prompt: "consent",
        includeGrantedScopes: true,
        accessType: "offline",
        scope: scopes,  
        state: state                
      })(req, res, next);
    } catch (error) {
      logger.error('[askAuthTokenController]', error);
      res.redirect(`${domains.server}/api/integrations/error?reason=server_error`);
    }
  }


const askAuthTokenCallbackController = async (req, res, next) => {
    try {
      await passport.authenticate(`integrations-${PROVIDER}`, {
        failureRedirect: `${domains.server}/api/integrations/error?reason=failed_oauth`,
        failureMessage: true,
        session: false,
      })(req, res, next);
    } catch (error) {
      logger.error('[askAuthTokenCallbackController]', error);
      res.redirect(`${domains.server}/api/integrations/error?reason=server_error`);
    }
}



const createAccessAndRefreshTokenController = async (req, res, next) => {
    try {
      const { state } = req.query;

      const { userId, service} = await findSessionStateToken(state);

      if (!userId || !service) {
        return res.redirect(`${domains.server}/api/integrations/error?reason=invalid_state`);
      } 

      const { accessToken, refreshToken, expiresIn, refreshTokenExpiresIn, scopes: services, profile } = req.user;
      const userEmail = profile?.emails?.[0]?.value || profile?._json?.email;

      if( !userEmail) {
        logger.error(`[createAccessAndRefreshTokenController] No email found in profile for user ${userId}`);
        return res.redirect(`${domains.server}/api/integrations/error?reason=missing_email`);
      }

      if (!accessToken && !refreshToken) {
        return res.redirect(`${domains.server}/api/integrations/error?reason=failed_oauth`);
      }

      if (accessToken) {
        await createOrUpdateAccessToken({
          userId,
          token: accessToken,
          expiresIn: expiresIn,
          services: services,
          userEmail: userEmail
        })
      }
      
      if (refreshToken) {
        await createOrUpdateRefreshToken({
          userId,
          token: refreshToken,
          expiresIn: refreshTokenExpiresIn,
          services: services,
          userEmail: userEmail
        });
      }
      
      logger.debug(`[createAccessAndRefreshTokenController] OAuth completed for user ${userId}, service ${service}`);
      res.redirect(`${domains.client}/integrations/google-workspace`);
    } catch (error) {
      logger.error('[createAccessAndRefreshTokenController]', error);
      res.redirect(`${domains.server}/api/integrations/error?reason=server_error`);
    }
   }

   
const revokeTokenAndDeleteController = async (req, res, next) => {
    try {
        const userId = req.user.id;    

        const accessToken = await findAccessTokenWithRefreshIfNeeded(userId)
    
        if (!accessToken) {
            return res.status(404).json({ message: 'No access token found' });
        }
    
        const accessTokenValue = decryptV3(accessToken.token);
        const tokenData = `token=${accessTokenValue}`;
        const url = "https://oauth2.googleapis.com/revoke";
        const revokeResponse = await fetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(tokenData).toString()                
            },
            body: tokenData            
        });

        if (!revokeResponse.ok) {
            return res.status(500).json({ message: 'Something went wrong.' });
        }

        const deleteAccessTokenResult = (await deleteTokens({
            identifier: `integration-${PROVIDER}-access-token-${userId}`
        })).deletedCount;
    
        if (deleteAccessTokenResult < 1) {
            logger.warn(`[revokeTokenAndDeleteController] No ${PROVIDER} Access Token found for user ${userId}`);
        } else {
            logger.info(`[revokeTokenAndDeleteController] ${PROVIDER} Access Token deleted for user ${userId}`);
        }
    
        const deleteRefreshTokenResult = (await deleteTokens({
            identifier: `integration-${PROVIDER}-refresh-token-${userId}`
        })).deletedCount;
    
        if (deleteRefreshTokenResult < 1) {
            logger.warn(`[revokeTokenAndDeleteController] No ${PROVIDER} Refresh Token found for user ${userId}`);
        } else {
            logger.info(`[revokeTokenAndDeleteController] ${PROVIDER} Refresh Token deleted for user ${userId}`);
        }
    
        res.status(200).json({ 
            accessTokenDeleted: deleteAccessTokenResult, 
            refreshTokenDeleted: deleteRefreshTokenResult 
        });
    } catch (error) {
        logger.error('[revokeTokenAndDeleteController]', error);
        res.status(500).json({ message: 'Something went wrong.' });
    }
}


module.exports = {
    errorController,
    checkEnabledController,
    getAccessTokenController,
    initAuthController,
    askAuthTokenController,
    askAuthTokenCallbackController,
    createAccessAndRefreshTokenController,
    revokeTokenAndDeleteController
  };
