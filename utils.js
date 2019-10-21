/**
 * Misc utilities and helper functions.
 * Author: Ronen Ness.
 * Since: 2019.
 */
"use strict";

module.exports = {
    
    /**
     * If got error, either call callback, or if not defined throw exception.
     * This is a helper function to help deal with Mongo's APIs.
     * Use like this:
     *  if (err) { return callback_or_exception(err, onError); }
     */
    callbackOrThrow: function(err, callback) 
    {
        if (callback) { 
            callback(err); 
        } 
        else { 
            throw err; 
        }
    },

    /**
     * Logger stub for when no logger is procided.
     */
    loggerStub: {
        error: function() {},
        warn: function() {},
        info: function() {},
        verbose: function() {},
        debug: function() {},
        silly: function() {},
    },

    /**
     * Check if two arrays are euqal
     */
    arraysEqual: function(arr1, arr2) {

        if(arr1.length !== arr2.length)
            return false;

        for(var i = arr1.length; i--;) {
            if(arr1[i] !== arr2[i])
                return false;
        }
        
        return true;
    }
}