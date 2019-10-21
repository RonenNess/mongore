/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');

/**
 * Numeric field type.
 */
class NumericField extends Field
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      min: Min allowed value.
     *      max: Max allowed value.
     *      canBeNull: If true, value can also be null (and won't be parsed as a number).
     *      parser: Method to parse value when cleaning it (default to parseFloat).
     * }
     */
    constructor(data)
    {
        super(data);
        this._parser = this._data.parser || parseFloat;
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        var type = this._parser == parseInt ? "an int" : "a double";
        var descriptionParts = [type];
        if (this._data.min !== undefined) {
             ret.minimum = this._data.min; 
             descriptionParts.push("smaller than " + this._data.min); 
        }
        if (this._data.max !== undefined) { 
            ret.maximum = this._data.max; 
            descriptionParts.push("larger than " + this._data.max); 
        }
        if (this.isMandatory) {
            descriptionParts.push("and is required");
        }
        return {
            bsonType: type.split(' ')[1],
            description: "must be " + descriptionParts.join(', ')
        };
    }

    /**
     * Get field's index type.
     */
    get indexType()
    {
        return 1;
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

        // store origin
        var origin = value;

        // clean value
        value = this._parser(value);
        if (isNaN(value) || typeof value !== "number") { 
            throw new Error(`Invalid numeric value '${origin}': not a valid number (using parser: ${this._parser.name}).`);
        }

        // check min-max
        if (this._data.min !== undefined && value < this._data.min) {
            throw new Error(`Invalid numeric value '${value}': may not be smaller than ${this._data.min}.`);
        }
        if (this._data.max !== undefined && value > this._data.max) {
            throw new Error(`Invalid numeric value '${value}': may not be larger than ${this._data.max}.`);
        }

        // return cleaned value
        return value;
    }

    /**
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return 0;
    }
} 

module.exports = NumericField;