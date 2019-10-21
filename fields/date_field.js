/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');

/**
 * Date field type.
 */
class DateField extends Field
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      autoNow: If true, this field will be current time if set to null.
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

        // date always allow null
        if (value === null) { 
            return this._data.autoNow ? new Date() : value; 
        }

        // validate type and return
        if (!(value instanceof Date)) {
            throw new Error(`Invalid date value '${value}': not a date.`);
        }
        return value;
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        return {
            bsonType: "date",
            description: "must be a date" + (this.isMandatory ? " and is required" : "")      
        }
    }

    /**
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return null;
    }
} 

module.exports = DateField;