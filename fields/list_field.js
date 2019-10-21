/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');

/**
 * List field type.
 */
class ListField extends Field
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      maxItems: Max list length.
     *      itemsType: Field instance to clean list values.
     *      removeDuplicates: If true, will remove duplicates when cleaned.
     * }
     */
    constructor(data)
    {
        super(data);
        this._type = data.itemsType;
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

        // make sure a list
        if (!(value instanceof Array)) {
            throw new Error(`Invalid list value '${value}': not a list.`);
        }

        // check max length
        if (this._data.maxItems !== undefined && value.length > this._data.maxItems) {
            throw new Error(`Invalid list value '${value}': list is too long (${value.length} > ${this._data.maxItems}).`);
        }

        // if we got a list type
        if (this._type) {
            var newList = [];
            for (var i = 0; i < value.length; ++i) {
                newList[i] = this._type.clean(instance, value[i]);
            }
            value = newList;
        }

        // remove duplicates
        if (this._data.removeDuplicates) {
            value = Array.from(new Set(value));
        }

        // return cleaned value
        return value;
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        var ret = {
            bsonType: "array",
            description: "must be a list" + (this.isMandatory ? " and is required" : "")      
        }
        if (this._data.maxItems) {
            ret.maxItems = this._data.maxItems;
        }
        if (this._data.removeDuplicates) {
            ret.uniqueItems = true;
        }
        return ret;
    }

    /**
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return [];
    }
} 


module.exports = ListField;