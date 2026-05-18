import { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception-filter';
import { HttpException, HttpStatus } from '@nestjs/common';

interface MockResponse {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<MockResponse, [unknown]>;
}

interface MockRequest {
  url: string;
  method: string;
}

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

interface ValidationException {
  response: {
    message: string[];
  };
  status: number;
}

function getLastJsonResponse(mockResponse: MockResponse): ErrorResponseBody {
  const responseBody = mockResponse.json.mock.calls.at(-1)?.[0];
  return responseBody as ErrorResponseBody;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockHost: ArgumentsHost;
  let mockResponse: MockResponse;
  let mockRequest: MockRequest;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {} as MockResponse;
    mockResponse.status = jest.fn(() => mockResponse);
    mockResponse.json = jest.fn(() => mockResponse);

    mockRequest = {
      url: '/test',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with status code and message', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const responseBody = getLastJsonResponse(mockResponse);
      expect(responseBody).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: responseBody.timestamp,
        path: '/test',
        message: 'Not found',
      });
      expect(typeof responseBody.timestamp).toBe('string');
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
      const responseBody = getLastJsonResponse(mockResponse);
      expect(responseBody).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: responseBody.timestamp,
        path: '/test',
        message: 'Bad Request',
      });
      expect(typeof responseBody.timestamp).toBe('string');
    });
  });

  describe('Unknown exception handling', () => {
    it('should handle unknown exceptions with INTERNAL_SERVER_ERROR', () => {
      const exception = new Error('Unknown error');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const responseBody = getLastJsonResponse(mockResponse);
      expect(responseBody).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: responseBody.timestamp,
        path: '/test',
        message: 'Internal server error',
      });
      expect(typeof responseBody.timestamp).toBe('string');
    });

    it('should handle validation errors', () => {
      const exception: ValidationException = {
        response: {
          message: ['name should not be empty', 'email must be an email'],
        },
        status: HttpStatus.BAD_REQUEST,
      };

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const responseBody = getLastJsonResponse(mockResponse);
      expect(responseBody).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: responseBody.timestamp,
        path: '/test',
        message: ['name should not be empty', 'email must be an email'],
      });
      expect(typeof responseBody.timestamp).toBe('string');
    });
  });

  describe('Timestamp format', () => {
    it('should return ISO 8601 timestamp', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const responseCall = getLastJsonResponse(mockResponse);
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

      const responseCall = getLastJsonResponse(mockResponse);
      expect(responseCall.path).toBe('/api/brands/123');
    });
  });
});
