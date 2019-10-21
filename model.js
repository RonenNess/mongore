/**
 * Define the Model base class.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const ModelInstanceWrapper = require('./model_instance_wrapper');
const ModelClassWrapper = require('./model_class_wrapper');


/**
 * Base Model class.
 * Inherit from this object to define your persistent models.
 */
class Model
{
    /**
     * Init the new model instance.
     */
    constructor()
    {
        // first sanity - if buildModel was not called, exception
        if (!this.constructor.mongore) {
            throw new Error("Cannot create instance of 'Model' before buildModel() is called!");
        }

        // attach the 'model' data on this object
        this.mongore = new ModelInstanceWrapper(this);

        // set default values
        var fieldNames = this.mongore.fieldNames;
        for (var i = 0; i < fieldNames.length; ++i) {
            this[fieldNames[i]] = this.mongore.getDefault(fieldNames[i]);
        }
    }

    /**
     * Will be called after this object was loaded from DB.
     */
    afterLoadedFromDB()
    {
    }

    /**
     * Will be called before this object is saved to DB. 
     */
    beforeSaveToDB()
    {
    }

    /**
     * Will be called after this object was successfully saved. 
     */
    afterSavedToDB()
    {
    }

    /**
     * Will be called after this object was successfully deleted. 
     */
    afterDeletedFromDB()
    {
    }
}

/**
 * Turn this JavaScript class into a functioning Model by extending the class and attaching the model metadata.
 * @param {*} modelData A dictionary with all the model MetaData. Contains the following (* means mandatory):
 * {
 *      *fields: Dictionary of fields to define in model.
 *      maxSizeInBytes: If defined, will limit this collection to this number of bytes.
 *      maxCount: If defined, will limit number of records in this collection to this size.
 *      collectionName: Collection name to use for this model. If not defined, will use class name + 's'.
 * }
 * 
 */
Model.buildModel = function(modelData) {
    
    // if already called, exception
    if (this.mongore) {
        throw new Error(`buildModel() already called on class ${this.name}.`);
    }

    // attach model class wrapper
    this.mongore = new ModelClassWrapper(this, modelData);

    // create all fields getters and setters
    var fields = modelData.fields;
    for (var fieldName in fields) {
        (function(_cls, _fieldName) {

            // already got a field with this name? exception
            if (_cls.prototype[_fieldName]) {
                throw new Error(`Cannot define field '${_fieldName}' in class '${_cls.name}': a property with that name already exist!`);
            }

            // define getter and setter
            Object.defineProperty(_cls.prototype, _fieldName, 
            { 
                get: function() 
                { 
                    return this.mongore._fields[_fieldName];
                },

                set: function(value) 
                { 
                    // if value didn't change, don't do anything
                    if (this.mongore.getFieldDescriptor(_fieldName).isEqual(value, this.mongore._fields[_fieldName])) { 
                        return; 
                    }

                    // set value and mark field as dirty
                    this.mongore._fields[_fieldName] = value;
                    this.mongore._dirtyFields.add(_fieldName);

                }
            });
        })(this, fieldName);
    }
}


// export the model class
module.exports = Model;