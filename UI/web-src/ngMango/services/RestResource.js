/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import angular from 'angular';

restResourceFactory.$inject = ['$http', '$q', '$timeout', 'maUtil', 'maNotificationManager', 'maRqlBuilder', 'MA_TIMEOUTS'];
function restResourceFactory($http, $q, $timeout, maUtil, NotificationManager, RqlBuilder, MA_TIMEOUTS) {
    
    const hasSymbol = typeof Symbol === 'function';
    const idProperty = 'xid';
    const originalIdProperty = hasSymbol ? Symbol('originalId') : 'originalId';
    const notificationManagerProperty = hasSymbol ? Symbol('notificationManager') : '_notificationManager';
    const httpBodyProperty = hasSymbol ? Symbol('httpBody') : '_httpBody';

    class RestResource {
        constructor(properties) {
            Object.assign(this, angular.copy(this.constructor.defaultProperties), properties);
            
            if (this.constructor.idProperty) {
                const itemId = this[this.constructor.idProperty];
                if (itemId) {
                    // item already has an ID store it in a private property so we can use it later when updating the item
                    this[originalIdProperty] = itemId;
                } else {
                    // new item, generate a new id for the item
                    this[this.constructor.idProperty] = (this.constructor.xidPrefix || '') + maUtil.uuid();
                }
            }
            
            this.initialize('constructor');
        }

        static get idProperty() {
            return idProperty;
        }
        
        static get timeout() {
            return MA_TIMEOUTS.xhr;
        }
        
        static createNotificationManager() {
            return new NotificationManager({
                webSocketUrl: this.webSocketUrl,
                transformObject: (...args) => {
                    return new this(...args);
                }
            });
        }
        
        static get notificationManager() {
            let notificationManager = this[notificationManagerProperty];
            
            if (!notificationManager) {
                notificationManager = this.createNotificationManager();
                this[notificationManagerProperty] = notificationManager;
            }
            
            return notificationManager;
        }

        static list(opts = {}) {
            return this.query(null, opts);
        }

        static query(queryObject, opts = {}) {
            const params = {};
            
            if (queryObject) {
                const rqlQuery = queryObject.toString();
                if (rqlQuery) {
                    params.rqlQuery = rqlQuery;
                }
            }
            
            return this.http({
                url: this.baseUrl,
                method: 'GET',
                params: params
            }, opts).then(response => {
                if (opts.responseType != null) {
                    return response.data;
                }
                
                const items = response.data.items.map(item => {
                    return new this(item);
                });
                items.$total = response.data.total;
                return items;
            });
        }
        
        static queryPost(queryObject, opts = {}) {
            return this.http({
                url: this.baseUrl + '/query',
                method: 'POST',
                data: queryObject
            }, opts).then(response => {
                if (opts.responseType != null) {
                    return response.data;
                }
                
                const items = response.data.items.map(item => {
                    return new this(item);
                });
                items.$total = response.data.total;
                return items;
            });
        }
        
        static buildQuery() {
            const builder = new RqlBuilder();
            builder.queryFunction = (queryObj, opts) => {
                return this.query(queryObj, opts);
            };
            return builder;
        }

        static get(id, opts) {
            const item = Object.create(this.prototype);
            item[originalIdProperty] = id;
            
            return item.get(opts).then(item => {
                return new this(item);
            });
        }
        
        static getById(id, opts) {
            const item = Object.create(this.prototype);
            item.id = id;
            
            return item.getById(opts).then(item => {
                return new this(item);
            });
        }

        static subscribe(...args) {
            return this.notificationManager.subscribe(...args);
        }

        static notify(...args) {
            // we only want to notify the listeners if they dont have a connected websocket
            // otherwise they will get 2 events
            return this.notificationManager.notifyIfNotConnected(...args);
        }
        
        static encodeUriSegment(segment) {
            return angular.$$encodeUriSegment(segment);
        }
        
        isNew() {
            return !this.hasOwnProperty(originalIdProperty);
        }
        
        getOriginalId() {
            return this[originalIdProperty];
        }

        getEncodedId() {
            return this.constructor.encodeUriSegment(this.getOriginalId());
        }
        
        setHttpBody(httpBody) {
            if (httpBody === undefined) {
                delete this[httpBodyProperty];
            } else {
                this[httpBodyProperty] = httpBody;
            }
        }
        
        getHttpBody() {
            return this[httpBodyProperty];
        }
        
        copy(createWithNewId = false) {
            const copy = angular.copy(this);

            if (createWithNewId) {
                copy[this.constructor.idProperty] = (this.constructor.xidPrefix || '') + maUtil.uuid();
            } else if (!this.isNew()) {
                copy[originalIdProperty] = this.getOriginalId();
            }
            
            if (this.hasOwnProperty(httpBodyProperty)) {
                copy[httpBodyProperty] = this[httpBodyProperty];
            }

            return copy;
        }

        get(opts = {}) {
            const originalId = this[originalIdProperty];
            return this.constructor.http({
                url: this.constructor.baseUrl + '/' + this.constructor.encodeUriSegment(originalId),
                method: 'GET',
                params: opts.params
            }, opts).then(response => {
                this.itemUpdated(response.data, opts.responseType);
                this.initialize('get');
                if (this.constructor.notifyUpdateOnGet) {
                    this.constructor.notify('update', this, originalId);
                }
                return this;
            });
        }
        
        getById(opts = {}) {
            return this.constructor.http({
                url: this.constructor.baseUrl + '/by-id/' + this.constructor.encodeUriSegment(this.id),
                method: 'GET',
                params: opts.params
            }, opts).then(response => {
                this.itemUpdated(response.data, opts.responseType);
                this.initialize('get');
                if (this.constructor.notifyUpdateOnGet) {
                    this.constructor.notify('update', this, this[originalIdProperty]);
                }
                return this;
            });
        }
        
        getAndSubscribe($scope, opts = {}) {
            return this.get(opts).catch(error => {
                if (error.status === 404) {
                    return this;
                }
                return $q.reject(error);
            }).then(item => {
                const id = this[this.constructor.idProperty];
                
                this.constructor.notificationManager.subscribeToXids([id], (event, updatedItem) => {
                    this.itemUpdated(updatedItem);
                    this.initialize('webSocket.' + event.name);
                }, $scope);
                
                return this;
            });
        }
        
        save(opts = {}) {
            const originalId = this[originalIdProperty];
            
            let url, method;
            if (originalId) {
                url = this.constructor.baseUrl + '/' + this.constructor.encodeUriSegment(originalId);
                method = 'PUT';
            } else {
                url = this.constructor.baseUrl;
                method = 'POST';
            }
            
            return this.constructor.http({
                url,
                method,
                data: this[httpBodyProperty] || this,
                params: opts.params
            }, opts).then(response => {
                const saveType = originalId ? 'update' : 'create';

                this.itemUpdated(response.data, opts.responseType);
                this.initialize(saveType);
                this.constructor.notify(saveType, this, originalId);
                return this;
            });
        }
        
        itemUpdated(item, responseType, useMerge) {
            if (responseType == null) {
                if (useMerge) {
                    angular.merge(this, item);
                } else {
                    angular.copy(item, this);
                }
                this[originalIdProperty] = this[this.constructor.idProperty];
            } else {
                this[httpBodyProperty] = item;
            }
        }
        
        delete(opts = {}) {
            const originalId = this[originalIdProperty];
            
            return this.constructor.http({
                url: this.constructor.baseUrl + '/' + this.constructor.encodeUriSegment(originalId),
                method: 'DELETE',
                params: opts.params
            }, opts).then(response => {
                this.itemUpdated(response.data, opts.responseType);
                this.initialize('delete');
                this.constructor.notify('delete', this, originalId);
                return this;
            });
        }
        
        initialize(reason) {
        }
        
        static http(httpConfig, opts = {}) {
            if (httpConfig.timeout == null) {
                const timeout = isFinite(opts.timeout) ? opts.timeout : this.timeout;
                
                if (!opts.cancel && timeout > 0) {
                    httpConfig.timeout = timeout;
                } else if (opts.cancel && timeout <= 0) {
                    httpConfig.timeout = opts.cancel;
                } else {
                    const timeoutPromise = $timeout(angular.noop, timeout, false);
                    const userCancelledPromise = opts.cancel.then(() => {
                        $timeout.cancel(timeoutPromise);
                    });
                    httpConfig.timeout = $q.race([userCancelledPromise, timeoutPromise.catch(angular.noop)]);
                }
            }

            if (opts.responseType != null) {
                httpConfig.responseType = opts.responseType;
            }
            
            if (opts.headers != null) {
                httpConfig.headers = Object.assign({}, httpConfig.headers, opts.headers);
            }
            
            return $http(httpConfig);
        }
        
        static defer() {
            return $q.defer();
        }
        
//        static createCancel(timeout = this.timeout) {
//            const deferred = $q.defer();
//            let timeoutPromise;
//            
//            const cancel = () => {
//                if (timeoutPromise) {
//                    $timeout.cancel(timeoutPromise);
//                }
//                deferred.resolve();
//            };
//            
//            if (timeout > 0) {
//                timeoutPromise = $timeout(cancel, timeout, false);
//            }
//            
//            cancel.promise = deferred.promise;
//            
//            return cancel;
//        }

        setEnabled(enable) {
            if (enable == null) {
                return this.enabled;
            }
            
            const prevValue = this.enabled;
            this.enabled = enable;
            
            if (this[originalIdProperty]) {
                this.$enableToggling = true;
                this.save().catch(error => {
                    this.enabled = prevValue;
                    return $q.reject(error);
                }).finally(() => {
                    delete this.$enableToggling;
                });
            }
        }
    }
    
    return RestResource;
}

export default restResourceFactory;


