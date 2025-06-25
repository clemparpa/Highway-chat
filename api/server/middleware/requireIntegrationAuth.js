const { getUserById } = require('~/models');
const { logger } = require('~/config');

/**
 * Middleware d'authentification pour les intégrations
 * Vérifie le UserID et le token via les headers X-User-ID et X-INTEGRATIONS-TOKEN
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Next middleware function
 * @returns {Promise<function|Object>} - Calls next() if authenticated, otherwise returns error response
 */
const requireIntegrationAuth = async (req, res, next = () => {}) => {
  try {
    // Extraction des paramètres depuis les headers uniquement
    const userId = req.headers['x-user-id'];
    const token = req.headers['x-integrations-token'];

    // Validation des paramètres requis
    if (!userId) {
      logger.debug('[requireIntegrationAuth] Missing X-User-ID header');
      return res.status(400).json({ message: 'Missing X-User-ID header' });
    }

    if (!token) {
      logger.debug('[requireIntegrationAuth] Missing X-INTEGRATIONS-TOKEN header');
      return res.status(401).json({ message: 'Missing X-INTEGRATIONS-TOKEN header' });
    }

    // Vérification du token contre l'environnement
    const expectedToken = process.env.CHAT_INTEGRATIONS_AUTH_TOKEN;
    if (!expectedToken) {
      logger.error('[requireIntegrationAuth] CHAT_INTEGRATIONS_AUTH_TOKEN not configured');
      return res.status(500).json({ message: 'Authentication not configured' });
    }

    if (token !== expectedToken) {
      logger.debug('[requireIntegrationAuth] Invalid token provided');
      return res.status(403).json({ message: 'Invalid authentication token' });
    }

    // Vérification de l'existence de l'utilisateur
    const user = await getUserById(userId, '-password -__v -totpSecret');
    
    if (!user) {
      logger.debug(`[requireIntegrationAuth] User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    logger.debug(`[requireIntegrationAuth] User found: ${userId}`);
    const userPayload = {
      id: user._id.toString(),
      role: user?.role || SystemRoles.USER,
      name: user.name || user.username || 'Unknown User',
    }
    
    // Ajout de l'utilisateur à la requête (standard de l'app)
    req.user = userPayload;
    
    logger.debug(`[requireIntegrationAuth] Authentication successful for user: ${userId}`);
    return next();

  } catch (error) {
    logger.error('[requireIntegrationAuth] Authentication error:', error);
    return res.status(500).json({ message: 'Internal authentication error' });
  }
};

module.exports = requireIntegrationAuth;
