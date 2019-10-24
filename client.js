/**
 * Implements basic connection to MongoDB + some helper functions.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Utils = require('./utils');
const callback_or_exception = Utils.callbackOrThrow;
var logger = Utils.loggerStub;


/**
 * Wrap MongoDB basic functionality.
 */
class MongoConnection
{
    /**
     * Create a new DB connection.
     * @param {MongoClient} MongoDB client (aquired with "require('mongodb').MongoClient").
     * @param {String} url MongoDB URL to connect to.
     * @param {String} dbName Database name to open.
     * @param {Function} onReady On success callback.
     * @param {Function} onError On error callback. If not provided, will throw exception.
     */
    connect(mongoClient, url, dbName, onReady, onError) 
    {
        // connect to mongodb
        logger.info(`Connecting to db '${url}'..`);
        mongoClient.connect(url, (err, db) => {
            
            // handle errors
            if (err) { return callback_or_exception(err, onError); }
                        
            // store db and dbo
            logger.info("Mongore ready!");
            this._db = db;
            this._dbo = db.db(dbName);

            // mark as ready
            this._isReady = true;

            // call ready callback
            if (onReady) { onReady(); }
        });
    }

    /**
     * Init mongore from existing connection.
     * @param {MongoClient} db MongoDB connected client.
     * @param {MongoClient.DB} dbo MongoDB opened database.
     */
    setConnection(db, dbo)
    {
        logger.info("Set Mongore from existing connection..");
        this._db = db;
        this._dbo = dbo;
        this._isReady = true;
        logger.info("Mongore ready!");
    }

    /**
     * Make sure DB is connected and throw exception if not.
     */
    validateReady()
    {
        if (!this._isReady) {
            throw new Error("DB is not connected! Please call Mongore.Client.connect() first.");
        }
    }

    /**
     * Replace logger.
     */
    set logger(value)
    {
        logger = value;
    }

    /**
     * Get logger.
     */
    get logger()
    {
        return logger;
    }

    /**
     * Create a new collection (don't do anything if already exist).
     * @param {String} name Collection name to create.
     * @param {*} options Collection options.
     * @param {Function} onReady On success callback.
     * @param {Function} onError On error callback. If not provided, will throw exception.
     */
    createCollection(name, options, onSuccess, onError)
    {
        this.validateReady();

        logger.info(`Create collection '${name}'..`);
        this._dbo.createCollection(name, options, function(err, res) {
            
            // handle errors
            if (err) { return callback_or_exception(err, onError); }

            // success
            logger.info(`Collection '${name}' ready.`);
            if (onSuccess) { onSuccess(); }
          });
    }

    /**
     * Create index on collection.
     * @param {String} collection Collection name.
     * @param {Array} indexes List of dictionaries with { fieldName: indexType }
     * @param {*} options Options dictionary.
     * @param {Function} onSuccess Callback to call on success.
     * @param {Function} onError Callback to call on error. If not defined will throw exception.
     */
    createIndex(collection, indexes, options, onSuccess, onError)
    {
        if (indexes.length === 0) {
            if (onSuccess) onSuccess();
            return;
        }

        this._dbo.collection(collection).createIndex(indexes, options, function(err, res) {
            
            if (err) { return callback_or_exception(err, onError); }
            
            logger.debug(`Created indexes '${JSON.stringify(indexes)}' with options '${JSON.stringify(options)}' on collection '${collection}'.`);
            if (onSuccess) { onSuccess(res); }
        });
    }

    /**
     * Insert a single document to DB.
     * @param {*} obj Object to insert (dictionary).
     * @param {String} collection Collection name.
     * @param {Function} onSuccess Callback to call on success.
     * @param {Function} onError Callback to call on error. If not defined will throw exception.
     */
    insertOne(obj, collection, onSuccess, onError)
    {
        this.validateReady();

        // log request
        logger.debug(`Insert object '${obj._id}' into collection '${collection}'..`);

        // insert to db
        this._dbo.collection(collection).insertOne(obj, function(err, res) {
            
            if (err) { return callback_or_exception(err, onError); }
            
            logger.debug("1 document inserted.");
            if (onSuccess) { onSuccess(res); }
        });
    }

    /**
     * Update a single document in DB.
     * @param {*} query Query object to locate document to update.
     * @param {*} obj Object to update (dictionary).
     * @param {String} collection Collection name.
     * @param {Function} onSuccess Callback to call on success.
     * @param {Function} onError Callback to call on error. If not defined will throw exception.
     */
    updateOne(query, obj, collection, onSuccess, onError)
    {
        this.validateReady();

        // log request
        logger.debug(`Update object '${JSON.stringify(query)}' in collection '${collection}'..`);

        // insert to db
        this._dbo.collection(collection).updateOne(query, {$set: obj}, function(err, res) {
            
            if (err) { return callback_or_exception(err, onError); }
            
            logger.debug("1 document updated.");
            if (onSuccess) { onSuccess(res); }
        });
    }

    /**
     * Get a single document using query.
     * @param {*} query Query dictionary to find.
     * @param {String} collection Collection name.
     * @param {Function} onSuccess Callback to call on success.
     * @param {Function} onError Callback to call on error. If not defined will throw exception.
     * @param {Function} onNotFound Callback to call if not found. If not defined will treat it like error. 
     */
    findOne(query, collection, onSuccess, onError, onNotFound)
    {
        this.validateReady();

        this._dbo.collection(collection).findOne(query, function(err, res) {

            // if got no error but document was not found, handle it
            if (!err && !res) {
                if (onNotFound) { return onNotFound(); }
                err = new Error(`Document matching query '${JSON.stringify(query)}' not found in collection '${collection}'!`);
            }

            // handle errors
            if (err) { return callback_or_exception(err, onError); }

            // success
            logger.debug(`1 document read (${res._id}).`);
            if (onSuccess) { onSuccess(res); }
        });
    }

    /**
     * Delete a single document using query.
     * @param {*} query Query dictionary to find.
     * @param {String} collection Collection name.
     * @param {Function} onSuccess Callback to call on success.
     * @param {Function} onError Callback to call on error. If not defined will throw exception.
     * @param {Function} onNotFound Callback to call if not found. If not defined will treat it like error. 
     */
    deleteOne(query, collection, onSuccess, onError, onNotFound)
    {
        this.validateReady();

        // log request
        logger.debug(`Delete object '${JSON.stringify(query)}' from collection '${collection}'..`);

        // do the delete
        this._dbo.collection(collection).deleteOne(query, function(err, res) {

            // if got no error but document was not found, handle it
            if (!err && !res) {
                if (onNotFound) { return onNotFound(); }
                err = new Error(`Document matching query '${JSON.stringify(query)}' not found in collection '${collection}'!`);
            }

            // handle errors
            if (err) { return callback_or_exception(err, onError); }

            // success
            logger.debug(`1 document deleted (${res._id}).`);
            if (onSuccess) { onSuccess(res); }
        });
    }

    /**
     * Delete documents using query.
     * @param {*} query Query dictionary to find.
     * @param {String} collection Collection name.
     * @param {Function} onSuccess Callback to call on success.
     * @param {Function} onError Callback to call on error. If not defined will throw exception.
     */
    deleteMany(query, collection, onSuccess, onError)
    {
        this.validateReady();

        // log request
        logger.debug(`Delete objects '${JSON.stringify(query)}' from collection '${collection}'..`);

        // do the delete
        this._dbo.collection(collection).deleteMany(query, function(err, res) {

            // handle errors
            if (err) { return callback_or_exception(err, onError); }

            // success
            logger.debug(`${res.result.n} document(s) deleted.`);
            if (onSuccess) { onSuccess(res); }
        });
    }

    /**
     * Drop a collection.
     * @param {String} collection Collection name.
     * @param {Function} onSuccess Callback to call on success.
     * @param {Function} onError Callback to call on error. If not defined will throw exception.
     */
    dropCollection(collection, onSuccess, onError)
    {
        this.validateReady();

        // log request
        logger.debug(`Drop collection '${collection}'..`);

        this._dbo.collection(collection).drop(function(err, res) {
            
            // handle errors
            if (err) { return callback_or_exception(err, onError); }

            logger.debug(`1 collection dropped (${collection}).`);
            if (onSuccess) { onSuccess(res); }

          });
    }

    /**
     * Close DB connection.
     */
    close()
    {
        if (this._db)
        {
            logger.info(`Closing Mongore connection.`);
            this._db.close();
            this._db = null;
            this._isReady = false;
        }
    }
}


// create instance and export connection
const instance = new MongoConnection();
module.exports = instance;