/**
 * Copyright (C) 2017 Infinite Automation Systems, Inc. All rights reserved.
 * http://infiniteautomation.com/
 * @author Jared Wiltshire
 */

import angular from 'angular';


NotificationManagerFactory.$inject = ['MA_BASE_URL', '$rootScope', 'MA_TIMEOUTS', '$q', '$timeout'];
function NotificationManagerFactory(MA_BASE_URL, $rootScope, MA_TIMEOUTS, $q, $timeout) {

	//const READY_STATE_CONNECTING = 0;
	const READY_STATE_OPEN = 1;
	//const READY_STATE_CLOSING = 2;
	//const READY_STATE_CLOSED = 3;
	
	const mapEventType = {
        add: 'create'
	};

    class NotificationManager {
        constructor(options) {
            angular.extend(this, options);
            
            this.listeners = 0;
            this.subscribedXids = {};
            this.subscribedToAllXidsCount = 0;
            this.eventScope = $rootScope.$new(true);
            this.eventScope.notificationManager = this;
            this.pendingRequests = {};
            this.sequenceNumber = 0;

            $rootScope.$on('maWatchdog', (event, current, previous) => {
                if (current.status === 'LOGGED_IN' && this.listeners > 0) {
                    // API is up and we are logged in
                    this.openSocket().catch(angular.noop);
                } else if (current.status === 'API_UP') {
                    // API is up but we aren't logged in
                    this.closeSocket();
                }
                // all other states we dont do anything
            });
        }

        openSocket() {
            // socket already open
            if (this.socketDeferred) {
                return this.socketDeferred.promise;
            }
            if (!('WebSocket' in window)) {
                return $q.reject('WebSocket not supported in this browser');
            }
            if (!this.webSocketUrl) {
                return $q.reject('No websocket URL');
            }
            
            const socketDeferred = this.socketDeferred = $q.defer();

            let host = document.location.host;
            let protocol = document.location.protocol;

            if (MA_BASE_URL) {
                const i = MA_BASE_URL.indexOf('//');
                if (i >= 0) {
                    protocol = MA_BASE_URL.substring(0, i);
                    host = MA_BASE_URL.substring(i+2);
                } else {
                    host = MA_BASE_URL;
                }
            }

            protocol = protocol === 'https:' ? 'wss:' : 'ws:';

            const socket = this.socket = new WebSocket(protocol + '//' + host + this.webSocketUrl);

            this.connectTimer = $timeout(() => {
                socketDeferred.reject('Timeout opening socket');
                this.closeSocket();
            }, MA_TIMEOUTS.websocket);
            
            socket.onclose = () => {
                socketDeferred.reject('Socket closed');
                this.closeSocket();
            };
            
            socket.onerror = () => {
                socketDeferred.reject('Socket error');
                this.closeSocket();
            };

            socket.onopen = () => {
                $timeout.cancel(this.connectTimer);
                delete this.connectTimer;
                
                this.pendingRequests = {};
                this.sequenceNumber = 0;
                
                $q.resolve(this.onOpen()).then(() => {
                    this.notify('webSocketOpen');
                    this.sendSubscription();
                    socketDeferred.resolve(this.socket);
                }).then(null, error => {
                    this.closeSocket();
                });
            };
            
            socket.onmessage = (event) => {
                try {
                    const message = angular.fromJson(event.data);
                    
                    if (message.status === 'ERROR') {
                        const error = new Error('Web socket status ERROR');
                        error.message = message;
                        throw error;
                    } else if (message.status === 'OK') {
                        const payload = message.payload;
                        this.notify('webSocketMessage', payload);
                        this.notifyFromPayload(payload);
                    } else if (typeof message.messageType === 'string') {
                        this.messageReceived(message);
                    }
                } catch (e) {
                    this.notify('webSocketError', e);
                }
            };

            return socketDeferred.promise;
        }

        onOpen() {
            // do nothing
        }
        
        /**
         * Processes the websocket payload and calls notify() with the appropriate event type.
         * Default notifier for CRUD type websocket payloads, they have a action and object property.
         */
        notifyFromPayload(payload) {
            if (typeof payload.action === 'string' && payload.object != null) {
                const eventType = mapEventType[payload.action] || payload.action;
                if (eventType) {
                    const item = this.transformObject(payload.object);
                    const originalXid = payload.originalXid;
                    
                    const attributes = {
                        originalXid,
                        initiatorId: payload.initiatorId,
                        updateArray(array, filterFn) {
                            if (!Array.isArray(array)) return;
                            const filterMatches = typeof filterFn === 'function' ? filterFn(item) : true;
                            const idProp = item.hasOwnProperty('id') ? 'id' : 'xid';
                            const itemId = idProp === 'xid' && originalXid || item[idProp];
                            
                            const index = array.findIndex(o => o[idProp] === itemId);
                            if (index >= 0) {
                                if (!filterMatches || eventType === 'delete') {
                                    array.splice(index, 1);
                                    return true;
                                } else if (eventType === 'update' || eventType === 'create') {
                                    Object.assign(array[index], item);
                                    return true;
                                }
                            } else if (filterMatches && (eventType === 'update' || eventType === 'create')) {
                                array.push(item);
                                return true;
                            }
                        }
                    };
                    
                    this.notify(eventType, item, attributes);
                }
            }
        }
        
        /**
         * Processes a V2 websocket message and calls notify()
         */
        messageReceived(message) {
            if (message.messageType === 'RESPONSE') {
                if (isFinite(message.sequenceNumber)) {
                    const request = this.pendingRequests[message.sequenceNumber];
                    if (request != null) {
                        request.deferred.resolve(message.payload);
                        $timeout.cancel(request.timeoutPromise);
                    }
                    delete this.pendingRequests[message.sequenceNumber];
                }
            } else if (message.messageType === 'NOTIFICATION') {
                const item = this.transformObject(message.payload);
                const notificationType = mapEventType[message.notificationType] || message.notificationType;
                this.notify(notificationType, item, message.attributes);
            }
        }

        closeSocket() {
            if (this.socketDeferred) {
                this.socketDeferred.reject('Socket closed');
                delete this.socketDeferred;
            }
            if (this.connectTimer) {
                $timeout.cancel(this.connectTimer);
                delete this.connectTimer;
            }
            if (this.socket) {
                this.socket.onclose = angular.noop;
                this.socket.onerror = angular.noop;
                this.socket.onopen = angular.noop;
                this.socket.onmessage = angular.noop;
                this.socket.close();
                delete this.socket;
            }
            
            Object.keys(this.pendingRequests).forEach(sequenceNumber => {
                const request = this.pendingRequests[sequenceNumber];
                request.deferred.reject('Socket closed');
                $timeout.cancel(request.timeoutPromise);
            });
            this.pendingRequests = {};
            this.sequenceNumber = 0;
        }
        
        socketConnected() {
            return this.socket && this.socket.readyState === READY_STATE_OPEN;
        }

        sendSubscription(eventTypes = ['create', 'update', 'delete']) {
            if (!this.supportsSubscribe) return;
            
            const xids = this.subscribedToAllXidsCount > 0 ? null : Object.keys(this.subscribedXids);
            
            return this.sendRequest({
                requestType: 'SUBSCRIPTION',
                notificationTypes: eventTypes,
                xids
            });
        }

        sendMessage(message) {
            if (this.socketConnected()) {
                this.socket.send(angular.toJson(message));
            }
        }
        
        sendRequest(message, timeout = MA_TIMEOUTS.websocketRequest) {
            if (this.socketConnected()) {
                const deferred = $q.defer();
                const timeoutPromise = $timeout(() => {
                    deferred.reject('Timeout');
                }, timeout);
                const sequenceNumber = this.sequenceNumber++;
                
                message.messageType = 'REQUEST';
                message.sequenceNumber = sequenceNumber;
                this.pendingRequests[sequenceNumber] = {
                    deferred,
                    timeoutPromise
                };
                
                this.socket.send(angular.toJson(message));
                return deferred.promise;
            } else {
                return $q.reject('Socket is not open');
            }
        }
        
        subscribeLocal(handler, $scope, eventTypes = []) {
            return this.subscribe(handler, $scope, eventTypes, null, true);
        }

        subscribe(handler, $scope, eventTypes = ['create', 'update', 'delete'], xids = null, localOnly = false) {
            if (typeof handler === 'object') {
                const options = handler;
                handler = options.handler;
                $scope = options.scope;
                eventTypes = options.eventTypes || ['create', 'update', 'delete'];
                xids = options.xids || null;
                localOnly = options.localOnly || false;
            }
            
            if (!localOnly) {
                const firstListener = this.listeners++ === 0;

                let subscriptionChanged = false;
                if (Array.isArray(xids)) {
                    xids.forEach(xid => {
                        if (!this.subscribedXids.hasOwnProperty(xid)) {
                            this.subscribedXids[xid] = 1;
                            subscriptionChanged = true;
                        } else {
                            // someone else is already subscribed to this xid, don't need to send anything
                            // just increment the count
                            this.subscribedXids[xid]++;
                        }
                    });
                } else {
                    subscriptionChanged = this.subscribedToAllXidsCount++ === 0;
                }
    
                if (firstListener) {
                    this.openSocket().catch(angular.noop);
                } else if (subscriptionChanged) {
                    this.sendSubscription();
                }
            }

            const applyThenHandle = (...args) => {
                if ($scope) {
                    $scope.$applyAsync(() => {
                        handler(...args);
                    });
                } else {
                    handler(...args);
                }
            };

            const eventDeregisters = [];
            eventTypes.forEach((eventType) => {
                const eventDeregister = this.eventScope.$on(eventType, applyThenHandle);
                eventDeregisters.push(eventDeregister);
            });
            
            let deregistered = false;
            const deregisterEvents = () => {
                if (!deregistered) {
                    eventDeregisters.forEach(eventDeregister => eventDeregister());
                    deregistered = true;
                    
                    if (!localOnly) {
                        const lastListener = --this.listeners === 0;

                        let subscriptionChanged = false;
                        // decrement the count for xid subscriptions
                        if (Array.isArray(xids)) {
                            xids.forEach(xid => {
                                this.subscribedXids[xid]--;

                                // unsubscribe any xids with no more listeners
                                if (this.subscribedXids[xid] === 0) {
                                    delete this.subscribedXids[xid];
                                    subscriptionChanged = true;
                                }
                            });
                        } else {
                            subscriptionChanged = --this.subscribedToAllXidsCount === 0;
                        }

                        if (lastListener) {
                            this.closeSocket();
                        } else if (subscriptionChanged) {
                            this.sendSubscription();
                        }
                    }
                }
            };
            
            const deregisterDestroy = $scope && $scope.$on('$destroy', deregisterEvents);
            
            const manualDeregister = () => {
                if (deregisterDestroy) {
                    deregisterDestroy();
                }
                deregisterEvents();
            };
            
            return manualDeregister;
        }
        
        subscribeToXids(xids, handler, $scope, eventTypes = ['create', 'update', 'delete']) {
            return this.subscribe((...args) => {
                const item = args[1];
                if (xids.includes(item.xid)) {
                    handler(...args);
                }
            }, $scope, eventTypes, xids);
        }
        
        /**
         * Notifies the event listeners of an event
         */
        notify(type, ...args) {
            this.eventScope.$broadcast(type, ...args);
        }
        
        /**
         * Notifies the event listeners only if the websocket is not connected. This is so the listener is not notified twice of the same change.
         */
        notifyIfNotConnected(type, ...args) {
            if (['create', 'update', 'delete'].indexOf(type) < 0 || !this.socket || this.socket.readyState !== READY_STATE_OPEN) {
                this.notify(type, ...args);
            }
        }
        
        transformObject(obj) {
            return obj;
        }
    }
	
	return NotificationManager;
}

export default NotificationManagerFactory;


