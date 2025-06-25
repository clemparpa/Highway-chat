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


// TODO
// Changer les tokens en enlevant les services dans identifier et le type
// Stocker les scopes dans les metadatas (surement possible de récupérer les scopes depuis le callback)
// Les methodes status et access_token doivent être modifiées pour prendre en compte les services (via les scopes) (necessite de changer le dataService en conséquence)
// Enlever les services dans la route de callback
// implementer le revoke avec la documentation https://developers.google.com/identity/protocols/oauth2/web-server?hl=fr#incrementalAuth
// Supprimer le token en cas de revoke 
// Implementer un refresh lorsque le token expire
// Implementer une duree maximum du token de refresh (6 mois ?)
// Implementer googleDocs 
// Nettoyer le repo et build une image
// Tester l'image 
// Creer des mcps pour intéragir avec (comment faire passer le token aux MCPs ?)

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
