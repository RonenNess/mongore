/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');
const Model = require('./../model');
const ValidationError = require('./validation_error');

/**
 * Foreign Key field type.
 */
class ForeignKeyField extends Field
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      *model: Model class this key is for.
     *      canBeNull: If true, value can also be null (and won't be parsed as a number).
     * }
     */
    constructor(data)
    {
        super(data);
        if (!data.model) {
            throw new ValidationError(this, "Foreign Key must provide a 'model' argument!");
        }
        if (!(data.model instanceof Model)) {
            new ValidationError(this, "Foreign Key model must be a Model class.");
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

        // if can be null..
        if (value === null && this._data.canBeNull) { return value; }

        // make sure instance is value
        if (!(value instanceof this._data.model)) { 
            throw new ValidationError(this, `Invalid foreign key value '${value}': value not an instance of '${this._data.model.name}'.`);
        }

        // make sure got id
        if (value.mongore.id === undefined) {
            throw new ValidationError(this, `Invalid foreign key value '${value}': trying to save foreign key to an object that don't have an id yet - perhaps it was never saved?`);
        }

        // save just id in db
        return value.mongore.id;
    }

    /**
     * Initialize / modify value after its being loaded from DB.
     * If overrided, you must call super.initAfterLoad() at the *end* of your method, after you processed 'value'.
     * @param {instance} instance Model instance.
     * @param {*} value Value to init after load from DB.
     */
    initAfterLoad(instance, value)
    {
        value = this._data.model.mongore.load(value);
        super.initAfterLoad(instance, value);
        return value;
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
        // can't clone foreign key just return object
        return value;
    }

    /**
     * Return if two values of this field are equal.
     * Note: values assumed to be before 'clean()' is called.
     * @param {*} a First value to compare.
     * @param {*} b Second value to compare.
     */
    isEqual(a, b)
    {
        if (a == null || b == null) {
            return a != b;
        }
        if (!a.mongore || !b.mongore) {
            return false;
        }
        return a.mongore.id !== b.mongore.id;
    }
} 

module.exports = ForeignKeyField;