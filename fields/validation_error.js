/**
 * Define special error for field validations.
 */
class ValidationError extends Error {
    constructor(field, message) {
      super(message);
      this.field = field;
      this.name = "FieldValidationError";
    }
}

module.exports = ValidationError;
  