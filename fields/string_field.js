/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');

/**
 * String field type.
 */
class StringField extends Field
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

        // if can be null..
        if (value === null && this._data.canBeNull) { return value; }

        // make sure its string
        value = value.toString()

        // validate max length
        if (this._data.maxLength !== undefined && value.length > this._data.maxLength) {
            throw new Error(`Invalid string value '${value}': may not be longer than ${this._data.maxLength}.`);
        }

        // validate min length
        if (this._data.minLength !== undefined && value.length > this._data.minLength) {
            throw new Error(`Invalid string value '${value}': may not be shorter than ${this._data.minLength}.`);
        }

        // return cleaned value
        return value;
    }

    /**
     * Get field's index type.
     */
    get indexType()
    {
        return 'text';
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        var ret = {
            bsonType: "string",
            description: "must be a string" + (this.isMandatory ? " and is required" : "")
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
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return "";
    }
} 

module.exports = StringField;