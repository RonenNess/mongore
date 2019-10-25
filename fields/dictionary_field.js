/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');
const arraysEqual = require('./../utils').arraysEqual;
const ValidationError = require('./validation_error');

/**
 * Dictionary field type.
 */
class DictionaryField extends Field
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      schema: Optional dictionary of fields to describe the desired dictionary schema.
     *              Note: when schema is provied, you also must provide a default value.
     * }
     */
    constructor(data)
    {
        super(data);
        this._schema = data.schema;
        if (data.schema && !data.default) {
            throw new ValidationError(this, "When defining DictionaryField schema you also have to set a corresponding default value!");
        }
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

        // make sure a dictionary
        if (value.constructor !== Object) {
            throw new ValidationError(this, `Invalid dictionary value '${value}': not a dictionary.`);
        }

        // if got schema, validate and clean it
        if (this._schema)
        {
            // first make sure keys match
            if (!arraysEqual(Object.keys(value), Object.keys(this._schema))) {
                var keys = JSON.stringify(Object.keys(value));
                throw new ValidationError(this, `Invalid dictionary value '${value}': value keys don't match schema (keys: '${keys}').`);
            }

            // now clean all values
            var newDict = {};
            for (var key in value) {
                newDict[key] = this._schema[key].clean(instance, value[key]);
            }
            value = newDict;
        }
 
        // return cleaned value
        return value;
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        if (!this._schema) {
            return {
                    bsonType: "object",
                    description: "must be a dictionary" + (this.isMandatory ? " and is required" : "")    
                };
        }
        
        // get list of mandatory fields
        var mandatoryFields = [];
        for (var field in this._schema) {
            if (this._schema[field].isMandatory) {
                mandatoryFields.push(field);
            }
        }

        // get all fields properties
        var properties = {};
        for (var field in this._schema) {
            properties[field] = this._schema[field].getValidatorProperties();
        }

        // set validator
        return {
                bsonType: "object",
                required: mandatoryFields,
                properties: properties,
                description: "must be a dictionary with a specific schema" + (this.isMandatory ? " and is required" : "")    
        }
    }

    /**
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return {};
    }
} 



module.exports = DictionaryField;