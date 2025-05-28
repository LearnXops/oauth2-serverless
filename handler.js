const express = require('express');
const bodyParser = require('body-parser');
const OAuthServer = require('oauth2-server');
const path = require('path');
const fs = require('fs');

const serverless = require('serverless-http');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Load Swagger document and modify server URL dynamically
const swaggerDocument = YAML.load('./swagger.yaml');

// Determine the server URL based on environment
const getServerUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || 3000;
  
  if (env === 'production') {
    // For AWS Lambda deployment
    return process.env.API_URL || 'https://api.your-domain.com';
  } else if (env === 'docker') {
    // For Docker deployment
    return `http://localhost:${port}`;
  } else {
    // For local development
    return `http://localhost:${port}`;
  }
};

// Set the server URL dynamically
swaggerDocument.servers = [{ url: getServerUrl() }];

// Import the model with admin functions
const oauthModel = require('./model.js');

const Request = OAuthServer.Request;
const Response = OAuthServer.Response;

const app = express();

// Simple admin authentication middleware
const adminAuth = (req, res, next) => {
    const adminKey = process.env.ADMIN_API_KEY;
    
    // Skip auth check if no admin key is configured (for development only)
    if (!adminKey) {
        console.warn('WARNING: No ADMIN_API_KEY set. Admin API is unprotected!');
        return next();
    }
    
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== adminKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing API key'
        });
    }
    
    next();
};

// Disable X-Powered-By header
app.disable('x-powered-by');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Initialize the OAuth server
const oauth = new OAuthServer({
    model: oauthModel, // Use the imported model
});

// Model file will handle DB interactions & token generation
// It should export an object that implements OAuth2 Server model specification

// Endpoint to obtain token using client credentials

/**
 * @api {post} /oauth/token Request Token
 * @apiName GetToken
 * @apiGroup OAuth
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Content-Type application/x-www-form-urlencoded
 * 
 * @apiBody {String} client_id The client ID.
 * @apiBody {String} client_secret The client secret.
 * @apiBody {String} grant_type The grant type, must be "client_credentials" or "refresh_token".
 * @apiBody {String} refresh_token The refresh token (required only when grant_type is "refresh_token").
 * 
 * @apiSuccess {String} accessToken The access token.
 * @apiSuccess {String} accessTokenExpiresAt The expiration date of the access token.
 * @apiSuccess {String} refreshToken The refresh token (only when using client_credentials grant).
 * @apiSuccess {String} refreshTokenExpiresAt The expiration date of the refresh token (only when using client_credentials grant).
 * @apiSuccess {Object} client The client object.
 * @apiSuccess {String} client.username The vendor ID.
 * @apiSuccess {Object} user The user object.
 * @apiSuccess {String} user.user_id The user ID.
 * @apiSuccess {String} user.username The username.
 * @apiSuccess {String} finalAuthToken The final authorization token.
 * 
 * @apiSuccessExample {json} Success-Response (Client Credentials):
 * {
 *     "accessToken": "actual_access_token",
 *     "accessTokenExpiresAt": "actual_access_token_expires_at",
 *     "refreshToken": "actual_refresh_token",
 *     "refreshTokenExpiresAt": "actual_refresh_token_expires_at",
 *     "client": {
 *         "username": "actual_userame"
 *     },
 *     "user": {
 *         "user_id": "actual_user_id",
 *         "username": "actual_userame"
 *     },
 *     "finalAuthToken": "Bearer actual_access_token"
 * }
 * 
 * @apiSuccessExample {json} Success-Response (Refresh Token):
 * {
 *     "accessToken": "new_access_token",
 *     "accessTokenExpiresAt": "new_access_token_expires_at",
 *     "refreshToken": "new_refresh_token",
 *     "refreshTokenExpiresAt": "new_refresh_token_expires_at",
 *     "client": {
 *         "username": "actual_userame"
 *     },
 *     "user": {
 *         "user_id": "actual_user_id",
 *         "username": "actual_userame"
 *     },
 *     "finalAuthToken": "Bearer new_access_token"
 * }
 * 
 * @apiError (400) invalid_request Content must be application/x-www-form-urlencoded.
 * @apiError (400) invalid_client Invalid client credentials.
 * @apiError (400) invalid_grant Invalid grant type.
 * @apiError (400) unsupported_grant_type The grant type is not supported.
 * @apiError (400) invalid_scope The requested scope is invalid.
 * @apiError (400) invalid_token The refresh token is invalid or expired.
 * 
 * @apiErrorExample {json} Error-Response (Invalid Content-Type):
 * {
 *     "statusCode": 400,
 *     "status": 400,
 *     "code": 400,
 *     "message": "Invalid request: content must be application/x-www-form-urlencoded",
 *     "name": "invalid_request"
 * }
 * 
 * @apiErrorExample {json} Error-Response (Invalid Client Credentials):
 * {
 *     "statusCode": 400,
 *     "status": 400,
 *     "code": 400,
 *     "message": "Invalid client: client is invalid",
 *     "name": "invalid_client"
 * }
 * 
 * @apiErrorExample {json} Error-Response (Invalid Grant Type):
 * {
 *     "statusCode": 400,
 *     "status": 400,
 *     "code": 400,
 *     "message": "Invalid grant: grant type is invalid",
 *     "name": "invalid_grant"
 * }
 * 
 * @apiErrorExample {json} Error-Response (Unsupported Grant Type):
 * {
 *     "statusCode": 400,
 *     "status": 400,
 *     "code": 400,
 *     "message": "Unsupported grant type: grant type is not supported",
 *     "name": "unsupported_grant_type"
 * }
 * 
 * @apiErrorExample {json} Error-Response (Invalid Scope):
 * {
 *     "statusCode": 400,
 *     "status": 400,
 *     "code": 400,
 *     "message": "Invalid scope: requested scope is invalid",
 *     "name": "invalid_scope"
 * }
 * 
 * @apiErrorExample {json} Error-Response (Invalid Refresh Token):
 * {
 *     "statusCode": 400,
 *     "status": 400,
 *     "code": 400,
 *     "message": "Invalid token: refresh token is invalid",
 *     "name": "invalid_token"
 * }
 * 
 * @apiSampleRequest https://oauth.your_server.com/oauth/token
 */
app.post('/oauth/token', (req, res, next) => {
    const request = new Request(req);
    const response = new Response(res);

    oauth.token(request, response)
        .then((token) => {
            res.json(token);
        }).catch((err) => {
            res.status(err.code || 500).json(err);
        });
});

/**
 * @api {get} /validate-token Validate Token
 * @apiName ValidateToken
 * @apiGroup OAuth
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Authorization Bearer <token>
 * 
 * @apiSuccess {Boolean} active Token validity status.
 * @apiSuccess {String} username The vendor ID.
 * @apiSuccess {String} expiresAt The expiration date of the access token.
 * 
 * @apiSuccessExample {json} Success-Response:
 * {
 *     "active": true,
 *     "username": "actual_userame",
 *     "expiresAt": "2024-07-12T11:18:06.463Z"
 * }
 * 
 * @apiError (400) invalid_token The token is invalid or has expired.
 * @apiErrorExample {json} Error-Response:
 * {
 *     "active": false,
 *     "error": "invalid_token",
 *     "error_description": "The access token provided is invalid."
 * }
 * 
 * @apiSampleRequest https://oauth.your_server.com/validate-token
 */

app.get('/validate-token', (req, res) => {
    const request = new OAuthServer.Request(req);
    const response = new OAuthServer.Response(res);

    // Assuming the token is in the Authorization header as a Bearer token
    oauth.authenticate(request, response)
        .then((token) => {
            // Token is valid
            res.json({
                active: true,
                username: token.client.username,
                expiresAt: token.accessTokenExpiresAt,
                scope: token.scope, // Optional: Include if you use scopes
            });
        })
        .catch((err) => {
            // Token is invalid or an error occurred
            res.status(err.code || 500).json({
                active: false,
                error: err.name,
                error_description: err.message,
            });
        });
});

// Admin API routes for OAuth access records

/**
 * @api {post} /admin/oauth-access Create OAuth Access
 * @apiName CreateOAuthAccess
 * @apiGroup Admin
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Content-Type application/json
 * @apiHeader {String} x-api-key Admin API key
 * 
 * @apiBody {String} user_id User ID
 * @apiBody {String} username Username
 * @apiBody {String} vendor_id Vendor ID
 * @apiBody {String} clientId Client ID
 * @apiBody {String} clientSecret Client Secret
 * @apiBody {Array} [grants=["client_credentials"]] Grant types
 * 
 * @apiSuccess {Object} record Created OAuth access record
 * 
 * @apiError (400) BadRequest Missing required fields or client ID already exists
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (500) ServerError Internal server error
 */
app.post('/admin/oauth-access', adminAuth, async (req, res) => {
    try {
        const record = await oauthModel.admin.createOAuthAccess(req.body);
        res.status(201).json(record);
    } catch (error) {
        res.status(error.message.includes('Missing required field') || 
                  error.message.includes('already exists') ? 400 : 500)
           .json({ error: error.message });
    }
});

/**
 * @api {get} /admin/oauth-access List OAuth Access Records
 * @apiName ListOAuthAccesses
 * @apiGroup Admin
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} x-api-key Admin API key
 * 
 * @apiQuery {String} [user_id] Filter by user ID
 * @apiQuery {String} [username] Filter by username (partial match)
 * @apiQuery {String} [vendor_id] Filter by vendor ID
 * @apiQuery {Number} [page=1] Page number
 * @apiQuery {Number} [limit=10] Items per page
 * 
 * @apiSuccess {Array} records List of OAuth access records
 * @apiSuccess {Object} pagination Pagination information
 * @apiSuccess {Number} pagination.total Total number of records
 * @apiSuccess {Number} pagination.page Current page
 * @apiSuccess {Number} pagination.limit Items per page
 * @apiSuccess {Number} pagination.pages Total number of pages
 * 
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (500) ServerError Internal server error
 */
app.get('/admin/oauth-access', adminAuth, async (req, res) => {
    try {
        const filters = {};
        if (req.query.user_id) filters.user_id = req.query.user_id;
        if (req.query.username) filters.username = req.query.username;
        if (req.query.vendor_id) filters.vendor_id = req.query.vendor_id;
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await oauthModel.admin.getAllOAuthAccesses(filters, page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @api {get} /admin/oauth-access/:id Get OAuth Access Record
 * @apiName GetOAuthAccess
 * @apiGroup Admin
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} x-api-key Admin API key
 * 
 * @apiParam {String} id Record ID or clientId
 * 
 * @apiSuccess {Object} record OAuth access record
 * 
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Record not found
 * @apiError (500) ServerError Internal server error
 */
app.get('/admin/oauth-access/:id', adminAuth, async (req, res) => {
    try {
        const record = await oauthModel.admin.getOAuthAccessById(req.params.id);
        res.json(record);
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 500)
           .json({ error: error.message });
    }
});

/**
 * @api {put} /admin/oauth-access/:id Update OAuth Access Record
 * @apiName UpdateOAuthAccess
 * @apiGroup Admin
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Content-Type application/json
 * @apiHeader {String} x-api-key Admin API key
 * 
 * @apiParam {String} id Record ID or clientId
 * 
 * @apiBody {String} [username] Username
 * @apiBody {String} [vendor_id] Vendor ID
 * @apiBody {String} [clientSecret] Client Secret
 * @apiBody {Array} [grants] Grant types
 * 
 * @apiSuccess {Object} record Updated OAuth access record
 * 
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Record not found
 * @apiError (500) ServerError Internal server error
 */
app.put('/admin/oauth-access/:id', adminAuth, async (req, res) => {
    try {
        const record = await oauthModel.admin.updateOAuthAccess(req.params.id, req.body);
        res.json(record);
    } catch (error) {
        let status = 500;
        if (error.message.includes('not found')) status = 404;
        else if (error.message.includes('No changes made')) status = 400;
        
        res.status(status).json({ error: error.message });
    }
});

/**
 * @api {delete} /admin/oauth-access/:id Delete OAuth Access Record
 * @apiName DeleteOAuthAccess
 * @apiGroup Admin
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} x-api-key Admin API key
 * 
 * @apiParam {String} id Record ID or clientId
 * 
 * @apiSuccess {Boolean} success Operation success status
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} deletedRecord The deleted record
 * 
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Record not found
 * @apiError (500) ServerError Internal server error
 */
app.delete('/admin/oauth-access/:id', adminAuth, async (req, res) => {
    try {
        const result = await oauthModel.admin.deleteOAuthAccess(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 500)
           .json({ error: error.message });
    }
});

/**
 * @api {get} /status Status Check
 * @apiName StatusCheck
 * @apiGroup System
 * @apiVersion 1.0.0
 * 
 * @apiSuccess {Boolean} status Service status
 * @apiSuccess {String} version API version
 * @apiSuccess {String} timestamp Current server timestamp
 * @apiSuccess {Object} database Database connection status
 * 
 * @apiSuccessExample {json} Success-Response:
 * {
 *     "status": true,
 *     "version": "1.0.0",
 *     "timestamp": "2025-05-28T04:43:22.123Z",
 *     "database": {
 *         "connected": true,
 *         "name": "oauthdb"
 *     }
 * }
 * 
 * @apiSampleRequest https://oauth.your_server.com/status
 */
app.get('/status', async (req, res) => {
    try {
        // Check database connection
        let dbStatus = { connected: false, name: process.env.MONGO_DB_NAME || 'oauthdb' };
        try {
            // Use the ensureConnection function from the model
            await oauthModel.admin.ensureConnection();
            dbStatus.connected = true;
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            dbStatus.error = dbError.message;
        }

        res.json({
            status: true,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.use('/api-docs', swaggerUi.serveFiles(swaggerDocument), swaggerUi.setup(swaggerDocument));

app.use('/docs', express.static(path.join(__dirname, 'apidoc')));

module.exports = {
    app,
    api: serverless(app)
};