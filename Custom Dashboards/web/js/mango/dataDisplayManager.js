/**
 * Javascript Object for the templating HTML pages.  
 * 
 * 
 * Copyright (C) 2014 Infinite Automation Software. All rights reserved.
 * @author Terry Packer
 */

/**
 * Data Display Manager
 * @param options
 * @returns
 */
DataDisplayManager = function(options){
    
    this.displayConfigurations = new Array();
    this.dataProviderConfigurations = new Array();
    
    this.dataProviders = new Array();
    this.displays = new Array();
    
    this.errorDivId = "errors";
    
    for(var i in options) {
        this[i] = options[i];
    }
};

DataDisplayManager.prototype = {
        displayConfigurations: null, //List of all display widget configuration
        dataProviderConfigurations: null, //List of data provider configurations
        
        displays: null, //List of our displays
        dataProviders: null, //List of all our data providers
        errorDivId: null, //Div to place error messages

        /**
         *  @param displayConfiguration - config to use
         *  @param createDisplay - optional boolean to create the object
         */
        addDisplayConfiguration: function(displayConfiguration){
            //Add a display configuration 
            this.displays.push(displayConfiguration.createDisplay());
            this.displayConfigurations.push(displayConfiguration);
        },
        
        clearProviders: function(){
            while(this.dataProviders.length >0)
                this.dataProviders.pop(); //Empty out array
        },
        
        /**
         * Using a point and a configuration create or find an existing data provider
         * @param dataPointConfiguration - data point configuration
         */
        addDataProvider: function(dataPointConfiguration){
            var dataProvider; 
            if(dataPointConfiguration.providerId != null){
                //Find it in the list
                for(var i=0; i<this.dataProviders.length; i++){
                    if(this.dataProviders[i].id == dataPointConfiguration.providerId){
                        this.dataProviders[i].addDataPoint(dataPointConfiguration);
                        return;
                    }
                }
                
            }else{
                //Assign an id
                dataPointConfiguration.providerId = this.dataProviders.length;
            }
            
            //None found, provider Id is set
            if(dataPointConfiguration.providerType == 'PointValue'){
                dataProvider = new PointValueDataProvider(dataPointConfiguration.providerId,dataPointConfiguration);
            }else if(dataPointConfiguration.providerType == 'Statistics'){
                dataProvider = new StatisticsDataProvider(dataPointConfiguration.providerId,dataPointConfiguration);
            }
            this.dataProviders.push(dataProvider);
            
            //Search our displays to find who wants to listen
            this.registerWithDisplays(dataProvider);
        },
        
        /**
         * Register a data provider with any displays that have it as one of
         * its dataProviderIds
         * @param dataProvider
         * @returns
         */
        registerWithDisplays: function(dataProvider){
            //Search our displays and add them as listeners to the data provider
            for(var i=0; i<this.displays.length; i++){
                if($.inArray(dataProvider.id, this.displays[i].dataProviderIds) >= 0){
                    dataProvider.addListener(this.displays[i]);
                }
            }
        },
        
        /**
         * 
         * 
         * @param dataProviderListener
         * @param optional id for provider to register with, if none then register with all
         */
        regsiterWithDataProviders: function(dataProviderListener, providerId){
            if(typeof providerId == 'undefined'){
                for(var i=0; i<this.dataProviders.length; i++){
                    this.dataProviders[i].addListener(dataProviderListener);
                }
            }else{
                for(var i=0; i<this.dataProviders.length; i++){
                    if(this.dataProviders[i].id == providerId){
                        this.dataProviders[i].addListener(dataProviderListener);
                    }
                }                
            }

        },
        
        /**
         * Refresh data providers with IDs (or if not defined then all)
         */
        refresh: function(ids, from, to, rollup, timePeriodType, timePeriods){
            if(typeof ids == 'undefined'){
                for(var i=0; i<this.dataProviders.length; i++)
                    this.dataProviders[i].load();
            }else{
                //We have Args
                for(var i=0; i<this.dataProviders.length; i++){
                    if($.inArray(this.dataProviders[i].id, ids) >= 0){
                        this.dataProviders[i].from = from;
                        this.dataProviders[i].to = to;
                        if(typeof this.dataProviders[i] == 'PointValueDataProvider'){
                            this.dataProviders[i].rollup = rollup;
                            this.dataProviders[i].timePeriodType = timePeriodType;
                            this.dataProviders[i].timePeriods = timePeriods;
                        }
                        this.dataProviders[i].load(this.error);
                    }
                      
                }
            }
        },
        
        /**
         * Helper Function to show error messages
         */
        error: function(jqXHR, textStatus, errorThrown, mangoMessage){
            
            var msg = "";
            if(textStatus != null)
                msg += (textStatus + " ");
            if(errorThrown != null)
                msg += (errorThrown + " ");
            if(mangoMessage != null)
                msg += (mangoMessage + " ");
            msg += "\n";
            $("#" + this.errorDivId).text(msg);
        }
        
};