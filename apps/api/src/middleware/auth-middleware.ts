import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to authenticate requests using API keys.
 * 
 * API keys should be stored in environment variables with the format:
 * API_KEY_<CLIENT_NAME>=<key>
 * 
 * Example environment variables:
 * API_KEY_CLIENT1=abc123def456
 * API_KEY_CLIENT2=xyz789uvw012
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract API key from request header
  const apiKey = req.headers['x-api-key'];

  // Check if API key is present
  if (!apiKey) {
    res.status(401).json({ error: 'API key is required' });
    return;
  }

  // Get all valid API keys from environment variables
  const validApiKeys = Object.keys(process.env)
    .filter(key => key.startsWith('API_KEY_'))
    .map(key => process.env[key])
    .filter((key): key is string => key !== undefined);

  // Check if the provided API key is valid
  if (!validApiKeys.includes(apiKey as string)) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  // API key is valid, proceed to next middleware/route handler
  next();
}

export default authMiddleware;
