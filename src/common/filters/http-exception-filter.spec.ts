import { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception-filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with status code and message', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: '/test',
        message: 'Not found',
      });
    });

    it('should handle HttpException with custom response object', () => {
      const exception = new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test',
        message: 'Bad Request',
      });
    });
  });

  describe('Unknown exception handling', () => {
    it('should handle unknown exceptions with INTERNAL_SERVER_ERROR', () => {
      const exception = new Error('Unknown error');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test',
        message: 'Internal server error',
      });
    });

    it('should handle validation errors', () => {
      const exception = {
        response: {
          message: ['name should not be empty', 'email must be an email'],
        },
        status: HttpStatus.BAD_REQUEST,
      } as any;

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test',
        message: ['name should not be empty', 'email must be an email'],
      });
    });
  });

  describe('Timestamp format', () => {
    it('should return ISO 8601 timestamp', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      const timestamp = responseCall.timestamp;

      expect(timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('Path extraction', () => {
    it('should extract correct path from request', () => {
      mockRequest.url = '/api/brands/123';
      const exception = new HttpException('Test', HttpStatus.OK);

      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.path).toBe('/api/brands/123');
    });
  });
});
