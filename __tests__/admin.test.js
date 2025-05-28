const request = require('supertest');
const { app } = require('../handler');

// Mock the admin API key for testing
process.env.ADMIN_API_KEY = 'test-admin-key';

// Mock the MongoDB model and admin functions
jest.mock('../model.js', () => {
  const mockOAuthAccess = {
    _id: 'test-id',
    user_id: 'test-user-id',
    username: 'test-username',
    vendor_id: 'test-vendor-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    grants: ['client_credentials']
  };

  return {
    admin: {
      ensureConnection: jest.fn().mockResolvedValue(true),
      createOAuthAccess: jest.fn().mockResolvedValue(mockOAuthAccess),
      getAllOAuthAccesses: jest.fn().mockResolvedValue({
        records: [mockOAuthAccess],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1
        }
      }),
      getOAuthAccessById: jest.fn().mockResolvedValue(mockOAuthAccess),
      updateOAuthAccess: jest.fn().mockResolvedValue({
        ...mockOAuthAccess,
        username: 'updated-username'
      }),
      deleteOAuthAccess: jest.fn().mockResolvedValue({
        success: true,
        message: 'OAuth access record deleted successfully',
        deletedRecord: mockOAuthAccess
      })
    }
  };
});

describe('Admin API Endpoints', () => {
  describe('Authentication', () => {
    it('should return 401 if no API key is provided', async () => {
      const response = await request(app).get('/admin/oauth-access');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 if invalid API key is provided', async () => {
      const response = await request(app)
        .get('/admin/oauth-access')
        .set('x-api-key', 'invalid-key');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Create OAuth Access', () => {
    it('should create a new OAuth access record', async () => {
      const newRecord = {
        user_id: 'test-user-id',
        username: 'test-username',
        vendor_id: 'test-vendor-id',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        grants: ['client_credentials']
      };

      const response = await request(app)
        .post('/admin/oauth-access')
        .set('x-api-key', 'test-admin-key')
        .send(newRecord);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('user_id', newRecord.user_id);
      expect(response.body).toHaveProperty('username', newRecord.username);
      expect(response.body).toHaveProperty('clientId', newRecord.clientId);
    });
  });

  describe('Get OAuth Access Records', () => {
    it('should return a list of OAuth access records', async () => {
      const response = await request(app)
        .get('/admin/oauth-access')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('records');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.records).toBeInstanceOf(Array);
      expect(response.body.records.length).toBeGreaterThan(0);
    });
  });

  describe('Get OAuth Access Record by ID', () => {
    it('should return a single OAuth access record', async () => {
      const response = await request(app)
        .get('/admin/oauth-access/test-id')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', 'test-id');
      expect(response.body).toHaveProperty('user_id', 'test-user-id');
      expect(response.body).toHaveProperty('username', 'test-username');
    });
  });

  describe('Update OAuth Access Record', () => {
    it('should update an OAuth access record', async () => {
      const updateData = {
        username: 'updated-username'
      };

      const response = await request(app)
        .put('/admin/oauth-access/test-id')
        .set('x-api-key', 'test-admin-key')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', 'test-id');
      expect(response.body).toHaveProperty('username', 'updated-username');
    });
  });

  describe('Delete OAuth Access Record', () => {
    it('should delete an OAuth access record', async () => {
      const response = await request(app)
        .delete('/admin/oauth-access/test-id')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletedRecord');
    });
  });
});
