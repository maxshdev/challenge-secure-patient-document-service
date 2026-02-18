import { UnauthorizedException } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';

describe('AuthMiddleware', () => {
    let middleware: AuthMiddleware;
    let mockResponse: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
        middleware = new AuthMiddleware();
        mockResponse = {};
        mockNext = jest.fn();
    });

    const createRequest = (headers: Record<string, string> = {}) =>
        ({ headers } as any);

    describe('valid requests', () => {
        it('should attach user for valid admin headers', () => {
            const req = createRequest({
                'x-user-id': 'admin-uuid',
                'x-user-role': 'admin',
            });

            middleware.use(req, mockResponse, mockNext);

            expect(req.user).toEqual({ id: 'admin-uuid', role: 'admin' });
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should attach user for valid doctor headers', () => {
            const req = createRequest({
                'x-user-id': 'doctor-uuid',
                'x-user-role': 'doctor',
            });

            middleware.use(req, mockResponse, mockNext);

            expect(req.user).toEqual({ id: 'doctor-uuid', role: 'doctor' });
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should attach user for valid patient headers', () => {
            const req = createRequest({
                'x-user-id': 'patient-uuid',
                'x-user-role': 'patient',
            });

            middleware.use(req, mockResponse, mockNext);

            expect(req.user).toEqual({ id: 'patient-uuid', role: 'patient' });
            expect(mockNext).toHaveBeenCalledTimes(1);
        });
    });

    describe('invalid requests', () => {
        it('should throw UnauthorizedException when x-user-id is missing', () => {
            const req = createRequest({ 'x-user-role': 'admin' });

            expect(() => middleware.use(req, mockResponse, mockNext)).toThrow(
                UnauthorizedException,
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException when x-user-role is missing', () => {
            const req = createRequest({ 'x-user-id': 'some-uuid' });

            expect(() => middleware.use(req, mockResponse, mockNext)).toThrow(
                UnauthorizedException,
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException when both headers are missing', () => {
            const req = createRequest({});

            expect(() => middleware.use(req, mockResponse, mockNext)).toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException for invalid role', () => {
            const req = createRequest({
                'x-user-id': 'some-uuid',
                'x-user-role': 'superuser',
            });

            expect(() => middleware.use(req, mockResponse, mockNext)).toThrow(
                UnauthorizedException,
            );
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
