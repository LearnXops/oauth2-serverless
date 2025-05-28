const request = require('supertest');
const { app } = require('../handler');

// Mock the OAuth model
jest.mock('../model.js', () => {
  const mockClient = {
    user_id: 'test-user-id',
    username: 'test-username',
    vendor_id: 'test-vendor-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    grants: ['client_credentials']
  };

  const mockToken = {
    accessToken: 'test-access-token',
    accessTokenExpiresAt: new Date(Date.now() + 3600000),
    client: { username: mockClient.username },
    user: { user_id: mockClient.user_id, username: mockClient.username },
    finalAuthToken: 'Bearer test-access-token'
  };

  return {
    getClient: jest.fn().mockResolvedValue(mockClient),
    saveToken: jest.fn().mockResolvedValue(mockToken),
    getAccessToken: jest.fn().mockResolvedValue(mockToken),
    getUserFromClient: jest.fn().mockReturnValue({
      user_id: mockClient.user_id,
      username: mockClient.username
    }),
    admin: {
      ensureConnection: jest.fn().mockResolvedValue(true)
    }
  };
});

describe('OAuth Token Endpoint', () => {
  it('should return 400 if content-type is not application/x-www-form-urlencoded', async () => {
    const response = await request(app)
      .post('/oauth/token')
      .send({
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        grant_type: 'client_credentials'
      });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('name', 'invalid_request');
  });

  it('should return token when valid credentials are provided', async () => {
    const response = await request(app)
      .post('/oauth/token')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('client_id=test-client-id&client_secret=test-client-secret&grant_type=client_credentials');
    
    // This test will pass because we've mocked the OAuth model
    // In a real scenario, it would validate credentials against the database
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('accessTokenExpiresAt');
    expect(response.body).toHaveProperty('client');
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('finalAuthToken');
  });
});

describe('Token Validation Endpoint', () => {
  it('should return 401 if no token is provided', async () => {
    const response = await request(app).get('/validate-token');
    
    expect(response.status).toBe(401);
  });

  it('should validate a valid token', async () => {
    const response = await request(app)
      .get('/validate-token')
      .set('Authorization', 'Bearer test-access-token');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('active', true);
    expect(response.body).toHaveProperty('username');
    expect(response.body).toHaveProperty('expiresAt');
  });
});
