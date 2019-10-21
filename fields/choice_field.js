/**
 * DB Field type.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Field = require('./field');

/**
 * Choice field type.
 */
class ChoiceField extends Field
{
     /**
     * Create the field descriptor.
     * @param {*} data Field data (different per type). May contain:
     * {
     *      default: Default value to set for field.
     *      *choices: List of choices to pick from.
     *      canBeNull: If true, value may also be null (and won't validate choice).
     * }
     */
    constructor(data)
    {
        super(data);
        if (!data.choices || !(data.choices instanceof Array)) {
            throw new Error("Must provide 'choices' array for choice field.");
        }
        this._choices = new Set(data.choices);
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

        // validate choice
        if (!this._choices.has(value)) {
            throw new Error(`Invalid choice value '${value}': value does not appear in possible choices ${this._choices}.`);
        }

        // return cleaned value
        return value;
    }
        
    /**
     * Get validator properties for this field.
     */
    getValidatorProperties()
    {
        return {
            enum: [ "Math", "English", "Computer Science", "History", null ],
            description: "can only be one of the following values: [" + this._choices.join(', ') + "]" + (this.isMandatory ? " and is required" : "")
        };
    }

    /**
     * Get field type default, if not defined.
     */
    get typeDefault()
    {
        return null;
    }
} 

module.exports = ChoiceField;