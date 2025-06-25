const { Strategy: GoogleStrategy } = require('passport-google-oauth20');


module.exports = () =>
  new GoogleStrategy(
    {
      clientID: process.env.INTEGRATIONS_GOOGLE_CLIENT_ID,
      clientSecret: process.env.INTEGRATIONS_GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.DOMAIN_SERVER}/api/integrations/google-workspace/callback`,
      skipUserProfile: false,
    },
    (accessToken, refreshToken, params, profile, done) => {   
      return done(null, {
          accessToken,
          expiresIn: params.expires_in,
          profile: profile,
          refreshToken,
          scopes: params.scope.split(" "),
          refreshTokenExpiresIn: params?.refresh_token_expires_in ?? 3600 * 24 * 30 * 6,
          provider: 'google'
        });
    },
  );
