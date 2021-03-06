/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

eventHandlerProvider.$inject = [];
function eventHandlerProvider() {
    
    const eventHandlerTypes = [
        {
            type: 'EMAIL',
            description: 'eventHandlers.type.email',
            template: `<ma-event-handler-email-editor></ma-event-handler-email-editor>`
        },
        {
            type: 'PROCESS',
            description: 'eventHandlers.type.process',
            template: `<ma-event-handler-process-editor></ma-event-handler-process-editor>`
        },
        {
            type: 'SET_POINT',
            description: 'eventHandlers.type.setPoint',
            template: `<ma-event-handler-set-point-editor></ma-event-handler-set-point-editor>`
        }
    ];
    
    this.registerEventHandlerType = function(type) {
        const existing = eventHandlerTypes.find(t => t.type === type.type);
        if (existing) {
            console.error('Tried to register event handler type twice', type);
            return;
        }
        eventHandlerTypes.push(type);
    };
    
    this.$get = eventHandlerFactory;
    
    eventHandlerFactory.$inject = ['maRestResource', '$templateCache', '$injector', '$rootScope', 'maEventTypeInfo'];
    function eventHandlerFactory(RestResource, $templateCache, $injector, $rootScope, EventTypeInfo) {

        const eventHandlerBaseUrl = '/rest/v2/event-handlers';
        const eventHandlerWebSocketUrl = '/rest/v2/websocket/event-handlers';
        const eventHandlerXidPrefix = 'EH_';

        const eventHandlerTypesByName = Object.create(null);
        eventHandlerTypes.forEach(eventHandlerType => {
            eventHandlerTypesByName[eventHandlerType.type] = eventHandlerType;
            
            // put the templates in the template cache so we can ng-include them
            if (eventHandlerType.template && !eventHandlerType.templateUrl) {
                eventHandlerType.templateUrl = `eventHandlers.${eventHandlerType.type}.html`;
                $templateCache.put(eventHandlerType.templateUrl, eventHandlerType.template);
            }
            
            Object.freeze(eventHandlerType);
        });
        
        Object.freeze(eventHandlerTypes);
        Object.freeze(eventHandlerTypesByName);
        
        
    	const defaultProperties = {
            name: '',
            eventTypes: [],
            handlerType: 'EMAIL',
            activeRecipients: [],
            additionalContext: [],
            customTemplate: '',
            disabled: false,
            sendEscalation: false,
            escalationDelay: 1,
            escalationDelayType: 'HOURS',
            escalationRecipients: [],
            sendInactive: false,
            activeProcessTimeout: 15,
            inactiveProcessTimeout: 15,
            inactiveOverride: false,
            inactiveRecipients: [],
            includeLogfile: false,
            includePointValueCount: 10,
            includeSystemInfo: false,
            scriptContext: [],
            activeAction: 'NONE',
            inactiveAction: 'NONE',
            subject: 'INCLUDE_EVENT_MESSAGE'
    	};
    	
        class EventHandler extends RestResource {
            static get defaultProperties() {
                return defaultProperties;
            }
            
            static get baseUrl() {
                return eventHandlerBaseUrl;
            }
            
            static get webSocketUrl() {
                return eventHandlerWebSocketUrl;
            }
            
            static get xidPrefix() {
                return eventHandlerXidPrefix;
            }
            
            static handlerTypes() {
                return eventHandlerTypes;
            }
            
            static handlerTypesByName() {
                return eventHandlerTypesByName;
            }
            
            static forEventType(eventType, subType, ref1, ref2) {
                const queryBuilder = this.buildQuery()
                    .eq('eventTypeName', eventType);
                
                if (subType !== undefined) {
                    queryBuilder.eq('eventSubtypeName', subType);
                }
                if (ref1 !== undefined) {
                    queryBuilder.eq('eventTypeRef1', ref1);
                }
                if (ref2 !== undefined) {
                    queryBuilder.eq('eventTypeRef2', ref2);
                }
                return queryBuilder.query();
            }

            static runCommand (command, timeout) {
                const url = `/rest/v2/server/execute-command`;

                const data = {
                    command: command,
                    timeout: timeout
                };

                return this.http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(response => {
                    return response.data;
                });
            }
            
            initialize() {
                if (Array.isArray(this.eventTypes)) {
                    this.eventTypes = this.eventTypes.map(et => new EventTypeInfo.EventType(et));
                }
            }
            
            addEventType(eventType) {
                if (!(eventType instanceof EventTypeInfo.EventType)) {
                    eventType = new EventTypeInfo.EventType(eventType);
                }
                this.eventTypes.push(eventType);
            }

            hasEventType(eventTypeId) {
                return this.eventTypes.some(et => et.typeId === eventTypeId);
            }
        }
    
        return EventHandler;
    }
}

export default eventHandlerProvider;