"use strict";
class ApiError {
    constructor(code, message) {
      this.code = code;
      this.message = message;
    }
    /**
     * @param {String} msg 
     * @returns error 400
     */
    static BadRequest(msg) {
      return new ApiError(400, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 401
     */
    static Unauthorized(msg) {
      return new ApiError(401, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 403
     */
    static Forbidden(msg) {
      return new ApiError(403, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 404
     */
    static NotFound(msg) {
      return new ApiError(404, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 409
     */
    static Conflict(msg) {
      return new ApiError(409, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 413
     */
    static TooLarge(msg) {
      return new ApiError(413, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 415
     */
    static Unsupported(msg) {
      return new ApiError(415, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 422
     */
    static Unprocessable(msg) {
      return new ApiError(422, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 429
     */
    static TooManyRequest(msg) {
      return new ApiError(429, msg);
    }
    /**
     * @param {String} msg 
     * @returns error 500
     */
    static internal(msg) {
      return new ApiError(500, msg);
    }
  }
  
  module.exports = ApiError