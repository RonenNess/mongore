/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const StringField = require('./string_field');
const ValidationError = require('./validation_error');
const emailRE = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;


/**
 * Email field type (validate email pattern).
 */
class EmailField extends StringField
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      maxLength: Max allowed string length.
     *      minLength: Min allowed string length.
     *      canBeNull: If true, value may also be null (and won't be converted to string).
     * }
     */
    constructor(data)
    {
        super(data);
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        var ret = {
            bsonType: "string",
            pattern : emailRE,
            description: "must be an email" + (this.isMandatory ? " and is required" : "")
        };
        if (this._data.maxLength) {
            ret.maxLength = this._data.maxLength;
        }
        if (this._data.minLength) {
            ret.minLength = this._data.minLength;
        }
        return ret;
    }

    /**
     * Validate and clean value before writing it to DB.
     * If overrided, you must call super.clean() at the *begining* of your method, after you processed 'value'.
     * @param {instance} instance Model instance.
     * @param {*} value Value to validate and clean. 
     */
    clean(instance, value)
    {
        value = super.clean(instance, value);

        // check email pattern
        if (!validateEmail(value)) {
            throw new ValidationError(this, `Invalid email value '${value}': not a valid email pattern.`);
        }

        // return cleaned value
        return value;
    }
} 

// check if value match an email pattern
function validateEmail(email) {
    return emailRE.test(email);
}

module.exports = EmailField;