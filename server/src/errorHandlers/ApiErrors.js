class ApiError {
    constructor(code, message) {
      this.code = code;
      this.message = message;
    }
  
    static BadRequest(msg) {
      return new ApiError(400, msg);
    }
  
    static Unauthorized(msg) {
      return new ApiError(401, msg);
    }
  
    static Forbidden(msg) {
      return new ApiError(403, msg);
    }
  
    static NotFound(msg) {
      return new ApiError(404, msg);
    }
  
    static Conflict(msg) {
      return new ApiError(409, msg);
    }

    static TooLarge(msg) {
      return new ApiError(415, msg);
    }

    static Unsupported(msg) {
      return new ApiError(415, msg);
    }

    static Unprocessable(msg) {
      return new ApiError(422, msg);
    }
  
    static TooManyRequest(msg) {
      return new ApiError(429, msg);
    }
  
    static internal(msg) {
      return new ApiError(500, msg);
    }
  }
  
  module.exports = ApiError