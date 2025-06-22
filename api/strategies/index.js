const appleLogin = require('./appleStrategy');
const passportLogin = require('./localStrategy');
const googleLogin = require('./googleStrategy');
const githubLogin = require('./githubStrategy');
const discordLogin = require('./discordStrategy');
const facebookLogin = require('./facebookStrategy');
const integrationsGoogleWorkspace = require("./integrationStrategys");
const { setupOpenId, getOpenIdConfig } = require('./openidStrategy');
const jwtLogin = require('./jwtStrategy');
const ldapLogin = require('./ldapStrategy');
const { setupSaml } = require('./samlStrategy');
const openIdJwtLogin = require('./openIdJwtStrategy');

module.exports = {
  appleLogin,
  passportLogin,
  googleLogin,
  githubLogin,
  discordLogin,
  jwtLogin,
  facebookLogin,
  setupOpenId,
  getOpenIdConfig,
  integrationsGoogleWorkspace,
  ldapLogin,
  setupSaml,
  openIdJwtLogin,
};
