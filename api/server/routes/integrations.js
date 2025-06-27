const express = require('express');
const { requireJwtAuth, requireIntegrationAuth, loginLimiter } = require('~/server/middleware');
const { isEnabled } = require('~/server/utils');
const {
  initAuthController,
  checkEnabledController,
  errorController,
  getAccessTokenController,
  createAccessAndRefreshTokenController,
  askAuthTokenController,
  askAuthTokenCallbackController,
  revokeTokenAndDeleteController,
} = require('~/server/controllers/integrations/GoogleIntegrationController');

const router = express.Router();

router.get('/error', errorController);


router.post("/google-workspace/:service/init", 
  requireJwtAuth,
  initAuthController,
)

router.get('/google-workspace/enabled', 
  requireJwtAuth,
  checkEnabledController
)

router.get('/google-workspace/access_token',
  requireIntegrationAuth,
  getAccessTokenController
)

router.get('/google-workspace', 
  askAuthTokenController
)
  
router.get("/google-workspace/callback", 
  askAuthTokenCallbackController, 
  createAccessAndRefreshTokenController
) 

router.post("/google-workspace/revoke",  
    requireJwtAuth,
    revokeTokenAndDeleteController
)


module.exports = router;
