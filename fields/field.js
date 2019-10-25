/**
 * Base class for a DB field.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const ValidationError = require('./validation_error');

/**
 * A DB field descriptor base class.
 * You can also use this class as a generic field with no constrains.
 */
class Field
{
    /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      source: If provided, will always copy value from a given property in the object before writing to DB. When loaded, will also set the property.
     *      sourceReadonly: If 'source' is provided and 'sourceReadonly' is true, will only copy from source when writing to DB, but won't set the property when loaded.
     *      canBeNull: Available for most types; allow null value.
     *      index: If true, will make this field an index field.
     *      unique: If true and indexed, will make this field unique.
     * }
     */
    constructor(data)
    {
        this._data = data || {};
        this._default = this._data.default === undefined ? this.typeDefault : this._data.default;
    }

    /**
     * Get if index field.
     */
    get isIndex()
    {
        return Boolean(this._data.index);
    }

    /**
     * Get if unique index field.
     */
    get isUniqueIndex()
    {
        return Boolean(this._data.unique);
    }

    /**
     * Validate and clean value before writing it to DB.
     * If overrided, you must call super.clean() at the *begining* of your method, after you processed 'value'.
     * @param {instance} instance Model instance.
     * @param {*} value Value to validate and clean. 
     */
    clean(instance, value)
    {
        if (this._data.source) {
            return instance[this._data.source];
        }
        return value;
    }

    /**
     * Get if this field is a mandatory field.
     */
    get isMandatory()
    {
        return !Boolean(this._data.canBeNull);
    }

    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        return {};
    }

    /**
     * Initialize / modify value after its being loaded from DB.
     * If overrided, you must call super.initAfterLoad() at the *end* of your method, after you processed 'value'.
     * @param {instance} instance Model instance.
     * @param {*} value Value to init after load from DB.
     */
    initAfterLoad(instance, value)
    {
        if (this._data.source && !this._data.sourceReadonly) {
            instance[this._data.source] = value;
        }
        return value;
    }

    /**
     * Get field's index type.
     */
    get indexType()
    {
        return 'hashed';
    }

    /**
     * Get default value.
     */
    get default()
    {
        return this.cloneData(this._default);
    }

    /**
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return null;
    }

    /**
     * Clone a value of this type (without validations or cleaning).
     * @param {*} value Value to clone. 
     */
    cloneData(value)
    {
        // if null, return null
        if (value === null) {
            return null;
        }

        // if its a complex object, clone with JSON.
        // if its a simple object, return as-is.
        return typeof value === "object" ? 
            JSON.parse(JSON.stringify(value)) : 
            value;
    }

    /**
     * Return if two values of this field are equal.
     * Note: values assumed to be before 'clean()' is called.
     * @param {*} a First value to compare.
     * @param {*} b Second value to compare.
     */
    isEqual(a, b)
    {
        return a === b;
    }
} 

module.exports = Field;