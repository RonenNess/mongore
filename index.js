/**
 * Mongore module index.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";
const Client = require('./client');
const Model = require('./model');
const Fields = require('./fields');

module.exports = {

    /**
     * Model base class - inherit from this class to define models.
     */
    Model: Model,

    /**
     * MongoDB client wrapper - you must call Client.connect() to start using Mongore.
     */
    Client: Client,

    /**
     * Field types you can define in your models.
     */
    Fields: Fields,
    
    /**
     * Provide Mongore with a logger to use.
     * @param {*} logger Logger instance, must have the following methods: {error, warn, info, verbose, debug, silly} 
     */
    setLogger: function(logger) {
        Client.logger = logger;
    },
};