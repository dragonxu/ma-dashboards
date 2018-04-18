/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import angular from 'angular';
import moment from 'moment-timezone';


/**
* @ngdoc service
* @name ngMangoServices.maUtil
*
* @description
* Provides  various utility functions that can be used in other directives and services.
*
* # Usage
*
* <pre prettyprint-mode="javascript">
    var changedXids = Util.arrayDiff(newValue.xids, oldValue.xids);
* </pre>
*/

UtilFactory.$inject = ['MA_BASE_URL', 'MA_DATE_FORMATS', '$q', '$timeout', 'MA_TIMEOUT', 'maRqlBuilder', '$window', '$injector'];
function UtilFactory(mangoBaseUrl, mangoDateFormats, $q, $timeout, mangoTimeout, RqlBuilder, $window, $injector) {
    
    const $stateParams = $injector.has('$stateParams') ? $injector.get('$stateParams') : null;
    const $state = $injector.has('$state') ? $injector.get('$state') : null;
    
    const SNAKE_CASE_REGEXP = /[A-Z]/g;
    const PREFIX_REGEXP = /^((?:x|data)[:\-_])/i;
    const SPECIAL_CHARS_REGEXP = /[:\-_]+(.)/g;

    const ENCODED_STATE_PARAM_NULL = 'null';
    
    const util = {

        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name arrayDiff
        *
        * @description
        * Utility for providing information about the difference between two arrays
        * @param {*[]} newArray New array to compare against old array.
        * @param {*[]} oldArray Old array that new array will compare against.
        * @returns {object}  Returns an object with the following properties:

        <ul><li>`added` - ARRAY of items that were added in newArray that were not in oldArray.</li>
        <li>`removed` - ARRAY of items that were in oldArray that were not in newArray.</li>
        <li>`changed` - BOOLEAN true/false depending on if there is a diff between the arrays.
        */
        arrayDiff(newArray, oldArray) {
            if (newArray === undefined) newArray = [];
            if (oldArray === undefined) oldArray = [];
    
            var added = angular.element(newArray).not(oldArray);
            var removed = angular.element(oldArray).not(newArray);
    
            return {
                added: added,
                removed: removed,
                changed: !!(added.length || removed.length)
            };
        },
    
        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name toMoment
        *
        * @description
        * Converts an input to a momentjs object
        * @param {string} input If input = 'now', moment(now) will be returned
        * @param {string} now standard date timestamp for converting to moment
        * @param {string} format If input equals a formatted date/time string, specify what format it is in to return
        *     moment(input, format || mangoDateFormats.dateTimeSeconds);
        * @returns {object}  Returns a moment js object.
        *
        */
        toMoment(input, now, format) {
            if (!input || input === 'now') return moment(now);
            if (typeof input === 'string') {
                return moment(input, format || mangoDateFormats.dateTimeSeconds);
            }
            return moment(input);
        },
    
        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name isEmpty
        *
        * @description
        * Test a string for null, undefined or whitespace
        * @param {string} str String to be tested for emptiness
        * @returns {boolean}  Returns true if `str` is null, undefined, or whitespace
        *
        */
        isEmpty(str) {
            return !str || /^\s*$/.test(str);
        },

        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name numKeys
        *
        * @description
        * Number of keys in object starting with specified string
        * @param {object} obj Object containing a certain number of items.
        * @param {string} start String used for testing keys
        * @returns {number}  Returns the number of keys in `obj` starting with the text given by `start` string
        *
        */
        numKeys(obj, start) {
            var count = 0;
            for (var key in obj) {
                if (key.indexOf(start) === 0) count++;
            }
            return count;
        },
        
        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name openSocket
        *
        * @description
        * If websocket is supported by the browser this utility will open a new websocket at the specified path.
        * @param {string} path Path of the API endpoint to open a websocket connection with
        * @returns {object}  Returns a WebSocket object at the specifed path
        *
        */
        openSocket(path) {
            if (!('WebSocket' in window)) {
                throw new Error('WebSocket not supported');
            }
    
            var host = document.location.host;
            var protocol = document.location.protocol;
    
            if (mangoBaseUrl) {
                var i = mangoBaseUrl.indexOf('//');
                if (i >= 0) {
                    protocol = mangoBaseUrl.substring(0, i);
                    host = mangoBaseUrl.substring(i+2);
                }
                else {
                    host = mangoBaseUrl;
                }
            }
    
            protocol = protocol === 'https:' ? 'wss:' : 'ws:';
    
            return new WebSocket(protocol + '//' + host + path);
        },

        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name transformArrayResponse
        *
        * @description
        * Parses an array response from a Mango endpoint which contains a total
        * and assigns it as the property $total on the array
        * @param {string} data JSON response from Mango endpoint
        * @param {string} fn REPLACE
        * @param {number} code String used for testing keys
        * @returns {object[]}  Array with $total property
        *
        */
        transformArrayResponse(data, headers, code) {
            try {
                if (!data) return data;
                var parsed = angular.fromJson(data);
                if (code < 300) {
                    parsed.items.$total = parsed.total || parsed.items.length;
                    return parsed.items;
                }
                return parsed;
            } catch (error) {
                console.log(error);
            }
        },
    
        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name arrayResponseInterceptor
        *
        * @description
        * Copies the total from the transformed array onto the actual destination
        * array and computes page number
        *
        */
        arrayResponseInterceptor(data) {
            if (data.data === undefined)
                return $q.reject(data);
            
            try {
                var start = 0;
                var limit = data.resource.length;
                var total = data.data.$total;
        
                var matches = /(?:&|\?)limit\((\d+)(?:,(\d+))?\)/i.exec(data.config.url);
                if (matches) {
                    limit = parseInt(matches[1], 10);
                    if (matches[2]) {
                        start = parseInt(matches[2], 10);
                    }
                }
        
                data.resource.$start = start;
                data.resource.$limit = limit;
                data.resource.$total = total;
                data.resource.$pages = Math.ceil(total / limit);
                data.resource.$page = Math.floor(start / limit) + 1;
            }
            catch (error) {
                console.log(error);
                return $q.reject(data);
            }
            return data.resource;
        },
    
        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name memoize
        *
        * @description
        * Extremely simple memoize function that works on === equality.
        * Used to prevent infinite digest loops in filters etc.
        *
        */
        memoize(fn, cacheSize) {
            var cache = [];
            cacheSize = cacheSize || 10;
            do {
                cache.push(undefined);
            } while (--cacheSize > 0);
    
            return function() {
                var args = Array.prototype.slice.call(arguments, 0);
    
                searchCache: for (var i = 0; i < cache.length; i++) {
                    var cacheItem = cache[i];
                    if (!cacheItem) break;
    
                    var cachedArgs = cacheItem.input;
                    if (cachedArgs.length !== args.length) continue;
    
                    for (var j = 0; j < cachedArgs.length; j++) {
                        if (cachedArgs[j] !== args[j]) continue searchCache;
                    }
    
                    return cacheItem.output;
                }
    
                var result = fn.apply(this, args);
    
                cache.unshift({input: args, output: result});
                cache.pop();
    
                return result;
            };
        },
        
        /**
        * @ngdoc method
        * @methodOf ngMangoServices.maUtil
        * @name rollupIntervalCalculator
        *
        * @description
        * Calculates rollup intervals based on time duration and rollup type
        * @param {string} from From Time
        * @param {string} to To Time
        * @param {string} rollupType Rollup Type (DELTA, AVERAGE etc.)
        * @returns {string} Returns a string holding the Rollup Interval (eg. `1 MINUTES`)
        *
        */
        rollupIntervalCalculator(from, to, rollupType, asObject) {
    
            var duration = moment(to).diff(moment(from));
            var result = {intervals: 1, units: 'SECONDS'};
            
            // console.log(duration,moment.duration(duration).humanize(),rollupType);
            
            if (duration > 60001 && duration <= 300001) {
                // 1 min - 5 mins
                result = {intervals: 5, units: 'SECONDS'};
            }
            else if (duration > 300001 && duration <= 900001) {
                // 5 min - 15 mins
                result = {intervals: 10, units: 'SECONDS'};
            }
            else if (duration > 900001 && duration <= 1800001) {
                // 15 min - 30 mins
                result = {intervals: 30, units: 'SECONDS'};
            }
            else if (duration > 1800001 && duration <= 10800001) {
                // 30 mins - 3 hours
                if (rollupType === 'DELTA') {
                    result = {intervals: 5, units: 'MINUTES'};
                }
                else {
                    result = {intervals: 1, units: 'MINUTES'};
                }
            }
            else if (duration > 10800001 && duration <= 21600001) {
                // 3 hours - 6 hours
                if (rollupType === 'DELTA') {
                    result = {intervals: 30, units: 'MINUTES'};
                }
                else {
                    result = {intervals: 2, units: 'MINUTES'};
                }
            }
            else if (duration > 21600001 && duration <= 86400001) {
                // 6 hours - 24 hours
                if (rollupType === 'DELTA') {
                    result = {intervals: 1, units: 'HOURS'};
                }
                else {
                    result = {intervals: 10, units: 'MINUTES'};
                }
            }
            else if (duration > 86400001 && duration <= 259200001) {
                // 1 day - 3 days
                if (rollupType === 'DELTA') {
                    result = {intervals: 6, units: 'HOURS'};
                }
                else {
                    result = {intervals: 30, units: 'MINUTES'};
                }
            }
            else if (duration > 259200001 && duration <= 604800001) {
                // 3 days - 1 week
                if (rollupType === 'DELTA') {
                    result = {intervals: 12, units: 'HOURS'};
                }
                else {
                    result = {intervals: 2, units: 'HOURS'};
                }
            }
            else if (duration > 604800001 && duration <= 1209600001) {
                // 1 week - 2 weeks
                if (rollupType === 'DELTA') {
                    result = {intervals: 1, units: 'DAYS'};
                }
                else {
                    result = {intervals: 3, units: 'HOURS'};
                }
            }
            else if (duration > 1209600001 && duration <= 2678400001) {
                // 2 weeks - 1 month
                if (rollupType === 'DELTA') {
                    result = {intervals: 1, units: 'DAYS'};
                }
                else {
                    result = {intervals: 4, units: 'HOURS'};
                }
            }
            else if (duration > 2678400001 && duration <= 15721200001) {
                // 1 month - 6 months
                if (rollupType === 'DELTA') {
                    result = {intervals: 1, units: 'WEEKS'};
                }
                else {
                    result = {intervals: 1, units: 'DAYS'};
                }
            }
            else if (duration > 15721200001 && duration <= 31622400001) {
                // 6 months - 1 YR
                if (rollupType === 'DELTA') {
                    result = {intervals: 2, units: 'WEEKS'};
                }
                else {
                    result = {intervals: 1, units: 'DAYS'};
                }
            }
            else if (duration > 31622400001) {
                // > 1 YR
                if (rollupType === 'DELTA') {
                    result = {intervals: 1, units: 'MONTHS'};
                }
                else {
                    result = {intervals: 1, units: 'DAYS'};
                }
            }
            // console.log(result);
            
            if (asObject) {
                return result;
            } else {
                return result.intervals + ' ' + result.units;
            }
        },
        
        objQuery(options) {
            if (!options) return this.query();
    
            const rqlBuilder = new RqlBuilder();
            const params = [];
            
            if (typeof options.query === 'string' && options.query) {
                params.push(options.query);
            } else if (options.query && typeof options.query.walk === 'function') { // RQL query object
                params.push(options.query.toString());
            } else if (options.query) {
                const or = !options.query.$and;
                const exact = !!options.query.$exact;
    
                if (or) {
                    rqlBuilder.or();
                }
                
                Object.keys(options.query)
                    .filter(k => k.indexOf('$') !== 0)
                    .map(k => ({key: k, value: options.query[k]}))
                    .filter(entry => entry.value !== undefined)
                    .forEach(({key, value}) => {
                        if (Array.isArray(value)) {
                            if (value.length) {
                                rqlBuilder.in(key, ...value);
                            }
                        } else if (typeof value === 'string' && value.indexOf('=') < 0 && !exact) {
                            rqlBuilder.like(key, '*' + value + '*');
                        } else {
                            rqlBuilder.eq(key, value);
                        }
                    });

                if (or) {
                    rqlBuilder.up();
                }
            }
    
            if (options.sort) {
                if (Array.isArray(options.sort)) {
                    rqlBuilder.sort(...options.sort);
                } else {
                    rqlBuilder.sort(options.sort);
                }
            }
    
            if (options.limit != null) {
                rqlBuilder.limit(options.limit, options.start || 0);
            }
            
            const rqlBuilderString = rqlBuilder.toString();
            if (rqlBuilderString) {
                params.push(rqlBuilderString);
            }
    
            return params.length ? this.query({rqlQuery: params.join('&')}) : this.query();
        },
        
        parseInternationalFloat(strValue) {
            strValue = standardizeFloat(strValue);
            return parseFloat(strValue);
            
            function standardizeFloat(strValue) {
                var matches;
    
                // has obvious space or full stop thousands separator and a comma as radix point
                // i.e. converts 1 234 567,89 to 1234567.89
                if ((matches = /\b(\d{1,3}(?:[\. ]\d{3})+),(\d+)/.exec(strValue))) {
                    return matches[1].replace(/[\. ]/g, '') + '.' + matches[2];
                }
                
                // convert groups of digits with 2 or more full stop thousands separators
                // i.e. converts 1.234.567 to 1234567
                if ((matches = /\b\d{1,3}(?:\.\d{3}){2,}(?!\d)/.exec(strValue))) {
                    return matches[0].replace(/\./g, '');
                }
    
                // remove any other commas, spaces and single quotes (can be thousands separators)
                strValue = strValue.replace(/[, ']/g, '');
                
                if ((matches = /[-+\.\d]+/.exec(strValue))) {
                    return matches[0];
                }
    
                return strValue;
            }
        },
        
        pointValueToString(pointValue, point) {
            if (point && typeof point.valueRenderer === 'function') {
                var rendered = point.valueRenderer(pointValue);
                if (rendered && rendered.text && typeof rendered.text === 'string') {
                    return rendered.text;
                }
            }
            
            if (typeof pointValue === 'number') {
                // convert to 3 fixed decimal places
                var numberString = pointValue.toFixed(3);
                
                // dont display trailing zeros
                if (numberString.substr(-4) === '.000') {
                    return numberString.slice(0, -4);
                } else if (numberString.substr(-2) === '00') {
                    return numberString.slice(0, -2);
                } else if (numberString.substr(-1) === '0') {
                    return numberString.slice(0, -1);
                } else {
                    return numberString;
                }
            }
            
            if (typeof pointValue === 'boolean') {
                return pointValue ? '1' : '0';
            }
            
            return '' + pointValue;
        },
        
        throwHttpError(error) {
            if (error instanceof Error) return $q.reject(error);
            if (error.status < 0)
                throw new Error('$http request timeout or cancelled');
            throw new Error(error.status + ' - ' + error.statusText);
        },
        
        cancelOrTimeout(cancelPromise, timeout) {
            timeout = isFinite(timeout) ? timeout : mangoTimeout;
            if (timeout > 0) {
                var timeoutPromise = $timeout(angular.noop, timeout, false);
                return $q.race([cancelPromise, timeoutPromise]);
            }
            return cancelPromise;
        },
    
        snakeCase(name, separator) {
            separator = separator || '-';
            return name.replace(SNAKE_CASE_REGEXP, function(letter, pos) {
              return (pos ? separator : '') + letter.toLowerCase();
            });
        },
        
        camelCase(name) {
            return name
                .replace(PREFIX_REGEXP, '')
                .replace(SPECIAL_CHARS_REGEXP, fnCamelCaseReplace);
            
            function fnCamelCaseReplace(all, letter) {
                return letter.toUpperCase();
            }
        },
        
        titleCase(input) {
            return input.replace(/\w\S*/g, function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        },
        
        downloadBlob(blob, filename) {
            if (typeof window.navigator.msSaveBlob === 'function') {
                window.navigator.msSaveBlob(blob, filename);
            } else {
                var url = URL.createObjectURL(blob);
                try {
                    var a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } finally {
                    URL.revokeObjectURL(url);
                }
            }
        },
        
        escapeRegExp(str) {
              return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
        },
    
        /**
         * @ngdoc method
         * @methodOf ngMangoServices.maUtil
         * @name deepReplace
         *
         * @description does a deep replace of object values, i.e. keeps the same array/object but replaces all of its keys
         */
        deepReplace(oldObject, newObject) {
            
            // remove keys from oldObject which don't exist in newObject
            if (Array.isArray(newObject) && Array.isArray(oldObject)) {
                oldObject.length = newObject.length;
            } else {
                Object.keys(oldObject).forEach(oldKey => {
                    if (!newObject.hasOwnProperty(oldKey)) {
                        delete oldObject[oldKey];
                    }
                });
            }
    
            Object.keys(newObject).forEach(key => {
                const newValue = newObject[key];
                const oldValue = oldObject[key];
                
                if (newValue != null && oldValue != null && typeof newValue === 'object' && typeof oldValue === 'object') {
                    this.deepReplace(oldValue, newValue);
                } else {
                    oldObject[key] = newValue;
                }
            });
        },

        /**
         * @ngdoc method
         * @methodOf ngMangoServices.maUtil
         * @name encodeStateParams
         * 
         * @description Encodes watch list parameters into a format that will work with $state.go().
         * Encodes null into 'null', and empty array into undefined, unwraps single element arrays e.g. [a] => a
         * Parameter names which are not found in $stateParams will be excluded from the output.
         * 
         * @param {object} inputParameters Watch list parameters to encode
         * @returns {object} Encoded parameters to pass to $state.go()
         */
        encodeStateParams(inputParameters) {
            const params = {};

            Object.keys(inputParameters).forEach(key => {
                const paramValue = inputParameters[key];

                if (!$stateParams.hasOwnProperty(key)) {
                    return;
                }

                if (Array.isArray(paramValue)) {
                    if (!paramValue.length) {
                        params[key] = undefined;
                    } else if (paramValue.length === 1) {
                        params[key] = paramValue[0] === null ? ENCODED_STATE_PARAM_NULL : paramValue[0];
                    } else {
                        params[key] = paramValue.map(value => {
                            return value === null ? ENCODED_STATE_PARAM_NULL : value;
                        });
                    }
                } else if (paramValue === null) {
                    params[key] = ENCODED_STATE_PARAM_NULL;
                } else {
                    params[key] = paramValue;
                }
            });
            
            return params;
        },

        /**
         * @ngdoc method
         * @methodOf ngMangoServices.maUtil
         * @name decodedStateParams
         * 
         * @description Returns $stateParams decoded into a format that can be used in watch list parameters.
         * Decodes 'null' into null.
         * 
         * @returns {object} Decoded parameters for watch list
         */
        decodedStateParams() {
            const params = Object.assign({}, $stateParams);

            Object.keys(params).forEach(key => {
                const paramValue = params[key];
                if (Array.isArray(paramValue)) {
                    params[key] = paramValue.map(value => {
                        return value === ENCODED_STATE_PARAM_NULL ? null : value;
                    });
                } else if (paramValue === ENCODED_STATE_PARAM_NULL) {
                    params[key] = null;
                }
            });
            
            return params;
        },
        
        /**
         * @ngdoc method
         * @methodOf ngMangoServices.maUtil
         * @name createArrayParams
         * 
         * @description Creates a parameters object where each value is always an array. Useful for setting
         *     multi-select watch list parameters from state parameters.
         * 
         * @param {object} parameters $stateParams like object
         * @returns {object} new parameters object where values are always arrays
         */
        createArrayParams(parameters) {
            const arrayParams = {};
            Object.keys(parameters).forEach(key => {
                const paramValue = parameters[key];
                if (paramValue === undefined) {
                    arrayParams[key] = [];
                } else if (!Array.isArray(paramValue)) {
                    arrayParams[key] = [paramValue];
                } else {
                    arrayParams[key] = paramValue;
                }
            });
            return arrayParams;
        },
        
        /**
         * @ngdoc method
         * @methodOf ngMangoServices.maUtil
         * @name differentToStateParams
         * 
         * @description Compares new state params to the current $stateParams
         * 
         * @param {object} updateParams New state params
         * @returns {boolean} true if updateParams are the different to the current $stateParams
         *
         */
        differentToStateParams(updateParams) {
            return Object.keys(updateParams).some(key => {
                const paramValue = updateParams[key];
                return $stateParams.hasOwnProperty(key) && !angular.equals(paramValue, $stateParams[key]);
            });
        },
        
        /**
         * @ngdoc method
         * @methodOf ngMangoServices.maUtil
         * @name updateStateParams
         * 
         * @description Updates $stateParams using $state.go() if updateParams are different to the current $stateParams
         * 
         * @param {object} updateParams New state params
         * @returns {boolean} true if updateParams were different and $state.go() was called
         */
        updateStateParams(updateParams) {
            if (this.differentToStateParams(updateParams)) {
                $state.go('.', updateParams, {location: 'replace', notify: false});
                return true;
            }
            return false;
        }
    };
    
    /**
    * @ngdoc method
    * @methodOf ngMangoServices.maUtil
    * @name uuid
    *
    * @description
    * Generates a v4 (random) UUID
    */
    if ($window.crypto && typeof $window.crypto.getRandomValues === 'function') {
        util.uuid = function uuid() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => {
                return (c ^ $window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
            });
        };
    } else {
        util.uuid = function uuid() {
            var uuid = '', i, random;
            for (i = 0; i < 32; i++) {
                random = Math.random() * 16 | 0;
    
                if (i === 8 || i === 12 || i === 16 || i === 20) {
                    uuid += '-';
                }
                uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
            }
            return uuid;
        };
    }
    
    return Object.freeze(util);
}

export default UtilFactory;

