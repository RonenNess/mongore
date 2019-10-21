/**
 * Define the mongore class that wraps model classes and provide the mongore CLASS api.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const DbClient = require('./client');


/**
 * This is the part that wraps the model class and provide all the class-related API (for example load()).
 */
class ModelClassWrapper
{
    /**
     * Create the Model class Wrapper.
     * @param {class} cls Model class to wrap.
     * @param {*} modelData Model data. 
     */
    constructor(cls, modelData)
    {
        // store class we wrap + mongore model data
        this._class = cls;
        this._md = modelData;
    }

    /**
     * Read this object from DB.
     * @param {*} query The object id or a query dictionary.
     * @param {Function} onSuccess Callback to invoke on success.
     * @param {Function} onNotFound Callback to call if not found. If not defined will treat it like error. 
     * @param {Function} onError Callback to invoke on error. If not defined, we'll get exception instead.
     */
    load(query, onSuccess, onNotFound, onError)
    {
        // create instance to return
        var ret = new this._class();

        // if query is not an object, set default query to use the _id field
        if (typeof query !== "object") { query = {_id: query} };

        // attempt load
        DbClient.findOne(query, this.collectionName, (data) => {
            ret.mongore._setFromDBDocument(data, true);
            if (onSuccess) { onSuccess(ret); }
        }, onError, onNotFound);

        // return object even if not ready
        return ret;
    }

    /**
     * Delete one or more objects that match the query.
     * @param {*} query The object id or a query dictionary.
     * @param {Function} onSuccess Callback to invoke on success.
     * @param {Function} onError Callback to invoke on error. If not defined, we'll get exception instead.
     */
    deleteMany(query, onSuccess, onError)
    {
        // if query is not an object, set default query to use the _id field
        if (typeof query !== "object") { query = {_id: query} };

        // attempt delete
        DbClient.deleteMany(query, this.collectionName, onSuccess, onError);
    }

    /**
     * Delete one object that match the query.
     * @param {*} query The object id or a query dictionary.
     * @param {Function} onSuccess Callback to invoke on success.
     * @param {Function} onError Callback to invoke on error. If not defined, we'll get exception instead.
     */
    delete(query, onSuccess, onError)
    {
        // if query is not an object, set default query to use the _id field
        if (typeof query !== "object") { query = {_id: query} };

        // attempt delete
        DbClient.deleteOne(query, this.collectionName, onSuccess, onError);
    }

    /**
     * Create the collection for this model.
     * This set validators, db indexes, ect automatically.
     * @param {Function} onSuccess Callback to invoke on success.
     * @param {Function} onError Callback to invoke on error. If not defined, we'll get exception instead.
     */
    createCollection(onSuccess, onError)
    {
        var collectionOptions = this.getCollectionOptions();

        // notify creation
        DbClient.logger.debug(`Create collection '${this.collectionName}' with properties: ${JSON.stringify(collectionOptions)}`);

        // create the collection
        DbClient.createCollection(this.collectionName, collectionOptions, () => {

            DbClient.logger.debug(`Collection '${this.collectionName}' created successfully. Create indexes..`);
            var indexes = [];
            var uniqueIndexes = [];
            for (var field in this._md.fields) {
                if (this._md.fields[field].isIndex) {
                    var index = {};
                    index[field] = this._md.fields[field].indexType;
                    (this._md.fields[field].isUniqueIndex ? uniqueIndexes : indexes).push(index);
                }
            }
            DbClient.createIndex(this.collectionName, indexes, {unique: false}, () => {            
                DbClient.createIndex(this.collectionName, uniqueIndexes, {unique: true}, () => {

                    DbClient.logger.debug(`Done creating collection: '${this.collectionName}'.`);
                    if (onSuccess) onSuccess();

                }, onError);
            }, onError);
            
        }, onError);
    }

    /**
     * Drop this Model's collection.
     */
    dropCollection(onSuccess, onError)
    {
        DbClient.dropCollection(this.collectionName, onSuccess, onError);
    }

    /**
     * Get the collection's options dictionary.
     */
    getCollectionOptions()
    {
        // create collection options dictionary
        var collectionOptions = {};

        // get list of mandatory fields
        var mandatoryFields = [];
        for (var field in this._md.fields) {
            if (this._md.fields[field].isMandatory) {
                mandatoryFields.push(field);
            }
        }

        // get all fields properties
        var properties = {};
        for (var field in this._md.fields) {
            properties[field] = this._md.fields[field].getValidatorProperties();
        }

        // set validators 
        collectionOptions.validator = {
            $jsonSchema: {
                bsonType: "object",
                required: mandatoryFields,
                properties: properties,
            }
        }

        // set size and max limit
        if (this._md.maxSizeInBytes) {
            collectionOptions.size = this._md.maxSizeInBytes;
            collectionOptions.capped = true;
        }

        // set max count
        if (this._md.maxCount) {
            collectionOptions.max = this._md.maxCount;
        }

        return collectionOptions;
    }

    /**
     * Get all field names.
     */
    get fieldNames()
    {
        return Object.keys(this._md.fields);
    }

    /**
     * Get the field descriptor for a given field name.
     */
    getFieldDescriptor(fieldName)
    {
        return this._md.fields[fieldName];
    }
    
    /**
     * Get field default value.
     * @param {String} fieldName Field name to get default value for.
     */
    getDefault(fieldName)
    {
        return this.getFieldDescriptor(fieldName).default;
    }

    /**
     * Get collection name of this object type.
     */
    get collectionName()
    {
        return this._md.collectionName || this._class.name + 's';
    }
}


// export the class wrapper
module.exports = ModelClassWrapper;