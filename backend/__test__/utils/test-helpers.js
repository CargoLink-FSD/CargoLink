import { jest } from '@jest/globals';


export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
  };
  return res;
};

export const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  };
};

export const createMockNext = () => {
  return jest.fn();
};

export const expectStatusCode = (res, statusCode) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
};

export const expectJsonResponse = (res, data) => {
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining(data));
};

export const createAuthenticatedRequest = (userId, role = 'customer', overrides = {}) => {
  return createMockRequest({
    user: {
      id: userId,
      role: role,
    },
    ...overrides,
  });
};
