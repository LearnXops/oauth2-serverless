const request = require('supertest');
const { app } = require('../handler');

// Mock the MongoDB connection
jest.mock('../model.js', () => {
  return {
    admin: {
      ensureConnection: jest.fn().mockResolvedValue(true)
    }
  };
});

describe('Status Endpoint', () => {
  it('should return 200 and status information', async () => {
    const response = await request(app).get('/status');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', true);
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('environment');
  });
});
