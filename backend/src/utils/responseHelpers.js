/**
 * Standardized Response Helpers
 * Eliminates 282+ occurrences of duplicate error handling patterns
 * Provides consistent API response formats across all controllers
 */

class ResponseHelpers {
  // === SUCCESS RESPONSES ===

  /**
   * Standard success response with data
   */
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Success response for resource creation
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Success response for resource updates
   */
  static updated(res, data = null, message = 'Resource updated successfully') {
    return this.success(res, data, message, 200);
  }

  /**
   * Success response for resource deletion
   */
  static deleted(res, message = 'Resource deleted successfully') {
    return res.status(200).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // === ERROR RESPONSES ===

  /**
   * Generic error response
   */
  static error(res, message, statusCode = 500, errorCode = null, details = null) {
    const response = {
      success: false,
      error: {
        message,
        code: errorCode,
        timestamp: new Date().toISOString()
      }
    };

    if (details) {
      response.error.details = details;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 400 Bad Request - Invalid input data
   */
  static badRequest(res, message = 'Bad request', details = null) {
    return this.error(res, message, 400, 'BAD_REQUEST', details);
  }

  /**
   * 401 Unauthorized - Authentication required
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * 403 Forbidden - Access denied to resource
   */
  static forbidden(res, message = 'Access denied') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * 404 Not Found - Resource doesn't exist
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * 409 Conflict - Resource already exists or conflict
   */
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409, 'CONFLICT');
  }

  /**
   * 422 Unprocessable Entity - Validation failed
   */
  static validationError(res, message = 'Validation failed', validationDetails = null) {
    return this.error(res, message, 422, 'VALIDATION_ERROR', validationDetails);
  }

  /**
   * 429 Too Many Requests - Rate limiting
   */
  static tooManyRequests(res, message = 'Too many requests') {
    return this.error(res, message, 429, 'TOO_MANY_REQUESTS');
  }

  /**
   * 500 Internal Server Error - Server-side error
   */
  static serverError(res, message = 'Internal server error', error = null) {
    // Log the actual error for debugging (don't expose to client)
    if (error) {
      console.error('Server error:', error);
    }
    
    return this.error(res, message, 500, 'INTERNAL_ERROR');
  }

  // === SPECIALIZED BUSINESS LOGIC RESPONSES ===

  /**
   * Missing parent ID (common pattern in controllers)
   */
  static missingParentId(res) {
    return this.unauthorized(res, 'Parent ID is required in request headers');
  }

  /**
   * Child ownership verification failed
   */
  static childAccessDenied(res, childId = null) {
    const message = childId 
      ? `Access denied to child ${childId}` 
      : 'Access denied to this child';
    return this.forbidden(res, message);
  }

  /**
   * Required fields validation failed
   */
  static missingRequiredFields(res, missingFields) {
    return this.validationError(res, `Missing required fields: ${missingFields.join(', ')}`, {
      missingFields
    });
  }

  /**
   * Subscription required for feature access
   */
  static subscriptionRequired(res, feature = 'this feature') {
    return this.forbidden(res, `Active subscription required to access ${feature}`);
  }

  /**
   * Resource limit exceeded (e.g., max children, max subjects)
   */
  static limitExceeded(res, resource, limit) {
    return this.badRequest(res, `Maximum ${resource} limit (${limit}) exceeded`);
  }

  /**
   * Database constraint violation (e.g., unique key, foreign key)
   */
  static constraintViolation(res, constraint = 'database constraint') {
    return this.conflict(res, `Operation violates ${constraint}`);
  }

  // === PAGINATION RESPONSES ===

  /**
   * Paginated success response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
        hasNext: pagination.hasNext || false,
        hasPrevious: pagination.hasPrevious || false
      },
      timestamp: new Date().toISOString()
    });
  }

  // === ASYNC ERROR HANDLER WRAPPER ===

  /**
   * Wraps async controller functions to handle errors consistently
   * Eliminates try-catch blocks in every controller method
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(error => {
        console.error('Async handler error:', error);
        
        // Handle known error types
        if (error.code === '23505') { // PostgreSQL unique violation
          return this.conflict(res, 'Resource already exists');
        }
        
        if (error.code === '23503') { // PostgreSQL foreign key violation  
          return this.badRequest(res, 'Invalid reference to related resource');
        }

        if (error.code === '23514') { // PostgreSQL check violation
          return this.validationError(res, 'Data validation failed');
        }

        // Default server error
        return this.serverError(res, 'An unexpected error occurred', error);
      });
    };
  }

  // === VALIDATION HELPER METHODS ===

  /**
   * Validate request and return standardized error if invalid
   */
  static validateRequest(req, res, validationRules) {
    const errors = [];

    // Check required headers
    if (validationRules.requiredHeaders) {
      validationRules.requiredHeaders.forEach(header => {
        if (!req.headers[header]) {
          errors.push(`Missing required header: ${header}`);
        }
      });
    }

    // Check required body fields
    if (validationRules.requiredFields) {
      validationRules.requiredFields.forEach(field => {
        if (!req.body[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }

    // Check required params
    if (validationRules.requiredParams) {
      validationRules.requiredParams.forEach(param => {
        if (!req.params[param]) {
          errors.push(`Missing required parameter: ${param}`);
        }
      });
    }

    if (errors.length > 0) {
      this.validationError(res, 'Request validation failed', { errors });
      return false;
    }

    return true;
  }

  // === LOGGING HELPER ===

  /**
   * Log response for debugging (in development)
   */
  static logResponse(message, data = null, level = 'info') {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

module.exports = ResponseHelpers;