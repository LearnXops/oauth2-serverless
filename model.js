const mongoConnStr = process.env.MONGO_CONN_STR || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'oauthdb';
const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient(mongoConnStr, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
let db;

let is_connected = false;

const createConn = async () => {
    await client.connect();
    is_connected = true;
    db = client.db(dbName);
};

// Ensure connection is established
const ensureConnection = async () => {
    if (!is_connected) {
        try {
            await createConn();
        } catch (e) {
            console.error('Failed to establish MongoDB connection:', e);
            throw e;
        }
    }
    return db;
};

const performQuery = async (clientId, clientSecret) => {
    const oauthAccess = db.collection('oauthaccesses');
    // Use await to wait for the query to complete and to get the results directly
    const oauthClient = await oauthAccess.findOne({ clientId, clientSecret });
    return oauthClient;
};

const tokens = [];

// Admin functions for CRUD operations on OAuth access records
const adminModel = {
    // Expose the ensureConnection function for status checks
    ensureConnection,
    // Create a new OAuth access record
    createOAuthAccess: async (oauthAccessData) => {
        try {
            const db = await ensureConnection();
            const oauthAccess = db.collection('oauthaccesses');
            
            // Validate required fields
            const requiredFields = ['user_id', 'username', 'vendor_id', 'clientId', 'clientSecret'];
            for (const field of requiredFields) {
                if (!oauthAccessData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Ensure grants is an array
            if (!oauthAccessData.grants || !Array.isArray(oauthAccessData.grants)) {
                oauthAccessData.grants = ['client_credentials']; // Default grant type
            }
            
            // Check if client ID already exists
            const existingClient = await oauthAccess.findOne({ clientId: oauthAccessData.clientId });
            if (existingClient) {
                throw new Error('Client ID already exists');
            }
            
            const result = await oauthAccess.insertOne(oauthAccessData);
            return { ...oauthAccessData, _id: result.insertedId };
        } catch (error) {
            console.error('Error creating OAuth access record:', error);
            throw error;
        }
    },
    
    // Get all OAuth access records
    getAllOAuthAccesses: async (filters = {}, page = 1, limit = 10) => {
        try {
            const db = await ensureConnection();
            const oauthAccess = db.collection('oauthaccesses');
            
            // Build query from filters
            const query = {};
            if (filters.user_id) query.user_id = filters.user_id;
            if (filters.username) query.username = { $regex: filters.username, $options: 'i' };
            if (filters.vendor_id) query.vendor_id = filters.vendor_id;
            
            // Calculate skip value for pagination
            const skip = (page - 1) * limit;
            
            // Get total count for pagination
            const total = await oauthAccess.countDocuments(query);
            
            // Get paginated results
            const records = await oauthAccess.find(query)
                .skip(skip)
                .limit(limit)
                .toArray();
            
            return {
                records,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching OAuth access records:', error);
            throw error;
        }
    },
    
    // Get a single OAuth access record by ID
    getOAuthAccessById: async (id) => {
        try {
            const db = await ensureConnection();
            const oauthAccess = db.collection('oauthaccesses');
            
            let query = {};
            if (ObjectId.isValid(id)) {
                query._id = new ObjectId(id);
            } else {
                query.clientId = id;
            }
            
            const record = await oauthAccess.findOne(query);
            if (!record) {
                throw new Error('OAuth access record not found');
            }
            
            return record;
        } catch (error) {
            console.error('Error fetching OAuth access record:', error);
            throw error;
        }
    },
    
    // Update an OAuth access record
    updateOAuthAccess: async (id, updateData) => {
        try {
            const db = await ensureConnection();
            const oauthAccess = db.collection('oauthaccesses');
            
            // Don't allow updating clientId to avoid conflicts
            if (updateData.clientId) {
                delete updateData.clientId;
            }
            
            let query = {};
            if (ObjectId.isValid(id)) {
                query._id = new ObjectId(id);
            } else {
                query.clientId = id;
            }
            
            // Check if record exists
            const existingRecord = await oauthAccess.findOne(query);
            if (!existingRecord) {
                throw new Error('OAuth access record not found');
            }
            
            const result = await oauthAccess.updateOne(query, { $set: updateData });
            
            if (result.modifiedCount === 0) {
                throw new Error('No changes made to the record');
            }
            
            return await oauthAccess.findOne(query);
        } catch (error) {
            console.error('Error updating OAuth access record:', error);
            throw error;
        }
    },
    
    // Delete an OAuth access record
    deleteOAuthAccess: async (id) => {
        try {
            const db = await ensureConnection();
            const oauthAccess = db.collection('oauthaccesses');
            
            let query = {};
            if (ObjectId.isValid(id)) {
                query._id = new ObjectId(id);
            } else {
                query.clientId = id;
            }
            
            // Check if record exists
            const existingRecord = await oauthAccess.findOne(query);
            if (!existingRecord) {
                throw new Error('OAuth access record not found');
            }
            
            const result = await oauthAccess.deleteOne(query);
            
            if (result.deletedCount === 0) {
                throw new Error('Failed to delete the record');
            }
            
            return { success: true, message: 'OAuth access record deleted successfully', deletedRecord: existingRecord };
        } catch (error) {
            console.error('Error deleting OAuth access record:', error);
            throw error;
        }
    }
};

const model = {
    getClient: async (clientId, clientSecret) => {
        try {
            if (!is_connected) {
                // Cold start or connection timed out. Create new connection.
                try {
                    await createConn();
                } catch (e) {
                    console.error(e);
                    return null;
                }
            }
            
            // For refresh_token grant, clientSecret might be null
            let query = { clientId };
            if (clientSecret) {
                query.clientSecret = clientSecret;
            }
            
            const oauthAccess = db.collection('oauthaccesses');
            const client = await oauthAccess.findOne(query);
            
            if (!client) return null;
            
            // Add refresh_token to supported grants
            return {
                ...client,
                grants: [...(client.grants || ['client_credentials']), 'refresh_token']
            };
        } catch (error) {
            console.error('Error fetching client from database:', error);
            return null;
        }
    },

    saveToken: async (token, client, user) => {
        const tokenData = {
            accessToken: token.accessToken,
            accessTokenExpiresAt: token.accessTokenExpiresAt,
            client: {
                username: client.username,
                id: client.clientId || client.id
            },
            user: user,
            finalAuthToken: `Bearer ${token.accessToken}`,
            refreshToken: token.refreshToken,
            refreshTokenExpiresAt: token.refreshTokenExpiresAt
        };
        try {
            if (!is_connected) {
                // Cold start or connection timed out. Create new connection.
                try {
                    await createConn();
                } catch (e) {
                    console.error(e);
                    return null;
                }
            }
            const tokensCollection = db.collection('tokens');
            await tokensCollection.insertOne(tokenData);
            const { _id, ...result } = tokenData;
            return result;
        } catch (error) {
            console.error('Error saving token to database:', error);
            throw error;
        }
    },

    getAccessToken: async (accessToken) => {
        try {
            if (!is_connected) {
                // Cold start or connection timed out. Create new connection.
                try {
                    await createConn();
                } catch (e) {
                    console.error(e);
                    return null;
                }
            }
            const tokensCollection = db.collection('tokens');
            const token = await tokensCollection.findOne({ accessToken: accessToken });
            if (token) {
                // Exclude _id field
                const { _id, ...result } = token;
                return result;
            }
            return null;
        } catch (error) {
            console.error('Error fetching token from database:', error);
            return null;
        }
    },

    getUserFromClient(client) {
        // Return an object to represent a service account or null
        return {
            user_id: client.user_id,
            username: client.username,
        }; // or return a user object if your application requires it
    },
    
    // Refresh token methods
    getRefreshToken: async (refreshToken) => {
        try {
            if (!is_connected) {
                try {
                    await createConn();
                } catch (e) {
                    console.error(e);
                    return null;
                }
            }
            const tokensCollection = db.collection('tokens');
            const token = await tokensCollection.findOne({ refreshToken });
            
            if (!token) {
                return null;
            }
            
            // Return the token in the format expected by oauth2-server
            return {
                refreshToken: token.refreshToken,
                refreshTokenExpiresAt: token.refreshTokenExpiresAt,
                client: token.client,
                user: token.user
            };
        } catch (error) {
            console.error('Error fetching refresh token:', error);
            return null;
        }
    },
    
    // Revoke the refresh token (called after using it to get a new access token)
    revokeToken: async (token) => {
        try {
            if (!is_connected) {
                try {
                    await createConn();
                } catch (e) {
                    console.error(e);
                    return false;
                }
            }
            
            const tokensCollection = db.collection('tokens');
            const result = await tokensCollection.deleteOne({ refreshToken: token.refreshToken });
            
            return result.deletedCount === 1;
        } catch (error) {
            console.error('Error revoking token:', error);
            return false;
        }
    },
};

// Export both the OAuth model and admin model
module.exports = {
    ...model,
    admin: adminModel
};
