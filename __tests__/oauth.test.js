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
    grants: ['client_credentials', 'refresh_token']
  };

  const mockToken = {
    accessToken: 'test-access-token',
    accessTokenExpiresAt: new Date(Date.now() + 3600000),
    refreshToken: 'test-refresh-token',
    refreshTokenExpiresAt: new Date(Date.now() + 1209600000), // 14 days
    client: { username: mockClient.username, id: mockClient.clientId },
    user: { user_id: mockClient.user_id, username: mockClient.username },
    finalAuthToken: 'Bearer test-access-token'
  };

  const mockRefreshToken = {
    refreshToken: 'test-refresh-token',
    refreshTokenExpiresAt: new Date(Date.now() + 1209600000),
    client: { username: mockClient.username, id: mockClient.clientId },
    user: { user_id: mockClient.user_id, username: mockClient.username }
  };

  return {
    getClient: jest.fn().mockResolvedValue(mockClient),
    saveToken: jest.fn().mockResolvedValue(mockToken),
    getAccessToken: jest.fn().mockResolvedValue(mockToken),
    getRefreshToken: jest.fn().mockResolvedValue(mockRefreshToken),
    revokeToken: jest.fn().mockResolvedValue(true),
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
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('refreshTokenExpiresAt');
    expect(response.body).toHaveProperty('client');
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('finalAuthToken');
  });
  
  it('should return a new token when using a valid refresh token', async () => {
    // Mock the oauth2-server token method to handle refresh token grant
    const originalToken = require('oauth2-server').prototype.token;
    require('oauth2-server').prototype.token = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        accessToken: 'new-access-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600000),
        refreshToken: 'new-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() + 1209600000),
        client: { username: 'test-username', id: 'test-client-id' },
        user: { user_id: 'test-user-id', username: 'test-username' },
        finalAuthToken: 'Bearer new-access-token'
      });
    });
    
    const response = await request(app)
      .post('/oauth/token')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('grant_type=refresh_token&refresh_token=test-refresh-token&client_id=test-client-id&client_secret=test-client-secret');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('accessTokenExpiresAt');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('refreshTokenExpiresAt');
    expect(response.body).toHaveProperty('client');
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('finalAuthToken');
    
    // Restore the original token method
    require('oauth2-server').prototype.token = originalToken;
  });
  
  it('should return 400 when using an invalid refresh token', async () => {
    // Mock the oauth2-server token method to throw an error for invalid refresh token
    const originalToken = require('oauth2-server').prototype.token;
    require('oauth2-server').prototype.token = jest.fn().mockImplementation(() => {
      const error = new Error('Invalid refresh token');
      error.name = 'invalid_grant';
      error.code = 400;
      error.status = 400;
      return Promise.reject(error);
    });
    
    const response = await request(app)
      .post('/oauth/token')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('grant_type=refresh_token&refresh_token=invalid-refresh-token&client_id=test-client-id&client_secret=test-client-secret');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('name', 'invalid_grant');
    
    // Restore the original token method
    require('oauth2-server').prototype.token = originalToken;
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
