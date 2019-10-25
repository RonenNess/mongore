/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const StringField = require('./string_field');
const ValidationError = require('./validation_error');

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
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

module.exports = EmailField;