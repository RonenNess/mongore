/**
 * Define the mongore class that wraps instances and provide the mongore INSTANCE api.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const DbClient = require('./client');


/**
 * This is the part that wraps the model and provide all the model-related API (for example save()).
 */
class ModelInstanceWrapper
{
    /**
     * Create the Model instance Wrapper.
     * @param {mongore.Model} instance Model instance to wrap. 
     */
    constructor(instance)
    {
        // store object we wrap + the class mongore wrapper
        this._object = instance;
        this._classWrapper = this._object.constructor.mongore;

        // store field values (used internally by the model getters and setters).
        this._fields = {};

        // last time this object was loaded from DB
        this._lastLoadTime = null;

        // was this instance loaded / saved to DB?
        this._isLoadedFromDB = false;
        this._isSavedToDB = false;

        // optional callback to invoke on first successful load
        this._onFirstLoad = null;

        // store which fields are currently dirty and need to be saved in db
        this._dirtyFields = new Set();
    }

    /**
     * Get field default value.
     * @param {String} fieldName Field name to get default value for.
     */
    getDefault(fieldName)
    {
        return this._classWrapper.getDefault(fieldName);
    }

    /**
     * Set a field to its default value.
     * @param {String} fieldName Field name to set to default.
     */
    setToDefault(fieldName)
    {
        this._object[fieldName] = this.getDefault(fieldName);
    }
    
    /**
     * Get the field descriptor for a given field name.
     */
    getFieldDescriptor(fieldName)
    {
        return this._classWrapper.getFieldDescriptor(fieldName);
    }

    /**
     * Get method to invoke after first successful load.
     */
    get onLoaded()
    {
        return this._onFirstLoad;
    }

    /**
     * Set callback to invoke after first successful load.
     * If already loaded, invoke immediately.
     */
    set onLoaded(value)
    {
        this._onFirstLoad = value;
        if (value && this._isLoadedFromDB) {
            value(this._object);
        }
    }

    /**
     * Get all field names.
     */
    get fieldNames()
    {
        return this._classWrapper.fieldNames;
    }

    /**
     * Called after this object was loaded from DB.
     */
    _afterLoadFromDB()
    {
        var firstLoad = !this._isLoadedFromDB;
        this._isLoadedFromDB = true;
        this._dirtyFields = new Set();
        this._lastLoadTime = new Date();
        this._object.afterLoadedFromDB();
        if (firstLoad && this.onFirstLoad) { this.onFirstLoad(this._object); }
    }

    /**
     * Called after this object was saved to DB.
     */
    _afterSaveToDB(data)
    {
        // mark that saved to db and clear dirty fields
        this._isSavedToDB = true;
        this._dirtyFields = new Set();

        // update metadata fields
        this._fields._dbCreationTime = data._dbCreationTime || this._fields._dbCreationTime;
        this._fields._dbLastUpdateTime = data._dbLastUpdateTime;
        this._fields._dbObjectVersion = data._dbObjectVersion;

        // call callback
        this._object.afterSavedToDB();
    }

    /**
     * Set fields from DB data.
     * @param {*} data Document as read from DB. 
     */
    _setFromDBDocument(data, invokePostLoadEvents)
    {
        // set fields values
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var descriptor = this.getFieldDescriptor(key);
                this._fields[key] = (descriptor) ? descriptor.initAfterLoad(this._object, data[key]) : data[key];
            }
        }

        // invoke post-load stuff
        if (invokePostLoadEvents) {
            this._afterLoadFromDB();
        }
    }

    /**
     * Return if got any dirty fields that need to be saved to DB.
     */
    get isDirty()
    {
        return this._dirtyFields.size !== 0;
    }

    /**
     * Get a list of currently dirty fields.
     */
    get dirtyFields()
    {
        return Array.from(this._dirtyFields);
    }

    /**
     * Get the time this object was first saved to DB.
     */
    get creationTime()
    {
        return this._fields._dbCreationTime;
    }

    /**
     * Get the time this object was last saved in DB.
     */
    get lastUpdateTime()
    {
        return this._fields._dbLastUpdateTime;
    }

    /**
     * Get the last time this object was loaded from DB.
     */
    get lastLoadTime()
    {
        return this._lastLoadTime;
    }

    /**
     * Get if this instance was loaded from DB.
     */
    get isLoadedFromDB()
    {
        return this._isLoadedFromDB;
    }

    /**
     * Get if this specific instance was ever saved to DB.
     */
    get isSavedToDB()
    {
        return this._isSavedToDB;
    }

    /**
     * Get object's version in DB.
     */
    get objectVersion()
    {
        return this._fields._dbObjectVersion;
    }

    /**
     * Get if this instance is in DB, either by save() or load().
     */
    get isInDB()
    {
        return this.isLoadedFromDB || this.isSavedToDB;
    }

    /**
     * Get the id field of this instance.
     */
    get id()
    {
        return this._fields._id;
    }

    /**
     * Delete this instance from DB. Be sure to set the model primary ID before calling this.
     * @param {Function} onSuccess Callback to invoke on success.
     * @param {Function} onError Callback to invoke on error. If not provided and have errors, will throw them as exception.
     */
    delete(onSuccess, onError)
    {
        DbClient.deleteOne({_id: this.id}, this.collectionName, (data) => {
            this._object.afterDeletedFromDB();
            if (onSuccess) { onSuccess(this); }
        }, onError);
    }

    /**
     * Save this instance to DB. Be sure to set the model primary ID before calling this.
     * @param {Function} onSuccess Callback to invoke on success.
     * @param {Function} onError Callback to invoke on error. If not provided and have errors, will throw them as exception.
     * @param {Boolean} forceSave If true, will save object even if nothing changed in it.
     */
    save(onSuccess, onError, forceSave)
    {
        // invoke before-save callback
        this._object.beforeSaveToDB();

        // already in db? use update
        if (this.isInDB)
        {
            if (forceSave || this.isDirty)
            {
                var data = this.toDocument(true);
                DbClient.logger.debug(`Save object ${this.collectionName}.${this.id} (force: ${forceSave}, dirtyFields: '${this.dirtyFields.join(',')}').`);
                DbClient.updateOne({_id: this.id}, data, this.collectionName, (data) => {
                    this._afterSaveToDB(data);
                    if (onSuccess) { onSuccess(this._object); }
                }, onError);
            }
            else
            {
                DbClient.logger.debug(`Skip saving ${this.collectionName}.${this.id} because the object is not dirty.`);
            }
        }
        // if not in db, attempt to use insert one
        else
        {
            var data = this.toDocument(false);
            DbClient.logger.debug(`Insert new object ${this.collectionName}.${this.id}.`);
            DbClient.insertOne(data, this.collectionName, (data) => {
                this._afterSaveToDB(data);
                if (onSuccess) { onSuccess(this._object); }
            }, onError);
        }
    }

    /**
     * Reload this instance from DB. Be sure to set the model primary ID before calling this.
     * @param {Function} onSuccess Callback to invoke on success.
     * @param {Function} onError Callback to invoke on error. If not provided and have errors, will throw them as exception.
     */
    reload(onSuccess, onError)
    {
        // sanity check
        if (!this.isInDB) {
            throw new Error("Cannot call 'reload()' on instances that were not load / saved to DB!");
        }

        // reload from db
        DbClient.findOne({_id: this.id}, this.collectionName, (data) => {
            this._setFromDBDocument(data, true);
            if (onSuccess) { onSuccess(this); }
        }, onError);
    }
    
    /**
     * Convert this object to a dictionary with all fields that should be saved to DB.
     * @param {Boolean} asRef If true, will get actual fields data dictionary by reference, which is risky.
     */
    toDocument(dirtyOnly) 
    {
        // iterate fields
        var ret = {};
        for (var key in this._fields) {
            
            // skip fields that are not dirty
            if (dirtyOnly && !this._dirtyFields.has(key)) {
                continue;
            }

            // do field validation and cleanup
            var descriptor = this.getFieldDescriptor(key);
            ret[key] = descriptor ? descriptor.clean(this._object, this._fields[key]) : this._fields[key];
        }

        // set special metadata
        ret._dbLastUpdateTime = new Date();
        ret._dbCreationTime = this._fields._dbCreationTime || ret._dbLastUpdateTime;
        ret._dbObjectVersion = (this._fields._dbObjectVersion || 0) + 1;

        // return data document
        return ret;
    }

    /**
     * Get collection name of this object.
     */
    get collectionName()
    {
        return this._classWrapper.collectionName;
    }
}


// export the instance wrapper
module.exports = ModelInstanceWrapper;