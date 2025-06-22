const { Strategy: GoogleStrategy } = require('passport-google-oauth20');


module.exports = () =>
  new GoogleStrategy(
    {
      clientID: process.env.INTEGRATIONS_GOOGLE_CLIENT_ID,
      clientSecret: process.env.INTEGRATIONS_GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.DOMAIN_SERVER}/api/integrations/google-workspace/callback`,
      skipUserProfile: true,
    },
    (accessToken, refreshToken, params, profile, done) => {   
      return done(null, {
          accessToken,
          expiresIn: params.expires_in,
          refreshToken,
          scopes: params.scope.split(" "),
          refreshTokenExpiresIn: params.refresh_token_expires_in,
          provider: 'google'
        });
    },
  );
