/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');
const ValidationError = require('./validation_error');

/**
 * Boolean field type.
 */
class BooleanField extends Field
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      canBeNull: If true, 'null' will also be a valid value (and it won't turn to 'false').
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
        if (value === null && this._data.canBeNull) { return value; }
        return Boolean(value);
    }

    /**
     * Get field's index type.
     */
    get indexType()
    {
        return 1;
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        return {
            bsonType: "bool",
            description: "must be a boolean" + (this.isMandatory ? " and is required" : "")
            
        }
    }

    /**
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return false;
    }
} 

module.exports = BooleanField;