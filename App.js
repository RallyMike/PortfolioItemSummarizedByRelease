// return all leaf stories of a hard-coded PI object ID


Ext.define('CustomApp', {
    extend:'Rally.app.App',
    componentCls:'app',
    layout:{
        type:'vbox',
        align:'stretch'
    },
    items:[

        { // define a container to house header info about the PI
            xtype:'container',
            itemId:'piHeaderContainer',
            padding:'15 15 15 15' // top ? bottom left,
        },
        {
            // panel where we will place the grid
            xtype:'panel',
            itemId:'piReleaseGridContainer',
            layout:'fit',
            height:400
        },
        {
            // panel where we will place the grid
            xtype:'panel',
            itemId:'piLeafStoryGridContainer',
            layout:'fit',
            height:400
        }
    ],


    // --- App global variables ---
    //gPiStories:[], // array to capture the list of all leaf stories in the PI
    gPiReleases:[], // array to capture the list of all stories a PI is scheduled in

    //gStoryGrid:undefined,

    // --- end global variables ---

    fireChooser:function () {
        Ext.create('Rally.ui.dialog.ChooserDialog', {
            artifactTypes:['PortfolioItem'],
            autoShow:true,
            title:'Select Portfolio Item',
            limit:20,
            height:500,
            listeners:{
                artifactChosen:function (selectedRecord) {
                    //Ext.Msg.alert('Chooser', selectedRecord.get('Name') + ' was chosen');
                    this._getLeafStoriesInPi(selectedRecord);
                },
                scope:this
            }
        });
    },

    launch:function () {

        // add select PI button to header
        var piHeaderContainer = this.down('#piHeaderContainer');
        piHeaderContainer.add({
            xtype:'rallybutton',
            text:'Select Portfolio Item',
            listeners:{
                click:this.fireChooser,
                scope:this
            }
        });


        // add PI name text box (nulled) to header
        var piTextBox = Ext.create('Ext.container.Container', {
            itemId:"piTextBox",
            html:""
        });
        piHeaderContainer.add(piTextBox);

    }, // end launch


    // reset the page's controls
    _reset:function () {
        this.gPiStories = [];
        //this._outstandingQueries = 0;
        this.down('#piLeafStoryGridContainer').removeAll();
    },


    // after PI selected, query for all its leaf level stories
    _getLeafStoriesInPi:function (selectedRecord) {

        var piFormattedID = selectedRecord.get('FormattedID');
        var piObjectID = selectedRecord.get('ObjectID');
        var piName = selectedRecord.get("Name");

        this._reset();


        var piTextBox = this.down('#piTextBox');
        //piHeaderContainer.removeAll(true);

        piTextBox.update("<br><b>Portfolio Item: </b>" + piFormattedID + " - " + piName);


        var query = {
            "__At":"current",
            "_TypeHierarchy":"HierarchicalRequirement",
            "Children":null,
            "_ItemHierarchy":piObjectID
        };

        // set query config info
        var find = ["ObjectID", "_UnformattedID", "Name", "Release", "ScheduleState", "PlanEstimate"];
        var queryString = Ext.JSON.encode(query);

        // set context to global across the workspace
        var context = this.getContext().getDataContext();
        context.project = undefined;

        // fetch the snapshot of all leaf level stories for the PI
        var ssPiLeafStories = Ext.create('Rally.data.lookback.SnapshotStore', {
            context:{
                workspace:this.context.getWorkspace(),
                project:this.context.getProject()
            },
            pageSize:10000000,
            fetch:find,
            rawFind:query,
            hydrate:["ScheduleState"],
            autoLoad:true,
            listeners:{
                scope:this,
                load:this._processPiStories
            }
        });


    }, // end _getStoriesInPi

    // bucket the PI's stories by RELEASE (and no release)
    _processPiStories:function (store, records) {

        // spit out all leaf stories into a grid
        var snapshotGrid = Ext.create('Rally.ui.grid.Grid', {
            title:'Snapshots',
            store:store,
            columnCfgs:[
                {
                    text:'ObjectID',
                    dataIndex:'ObjectID'
                },
                {
                    text:'Name',
                    dataIndex:'Name'
                },
                {
                    text:'Project',
                    dataIndex:'Project'
                },
                {
                    text:'_UnformattedID',
                    dataIndex:'_UnformattedID'
                },
                ,
                {
                    text:'Release',
                    dataIndex:'Release'
                },
                {
                    text:'PlanEstimate',
                    dataIndex:'PlanEstimate'
                },
                {
                    text:'ScheduleState',
                    dataIndex:'ScheduleState'
                }
            ],
            height:400
        });

        // render the grid of all of the PI's leaf stories
        var gridHolder = this.down('#piLeafStoryGridContainer');
        gridHolder.removeAll(true);
        gridHolder.add(snapshotGrid);


        // --- BUCKET TIME BABY ---
        var aStory;
        var aRelease;

        var nbrStories = records.length;

        var storyNdx;

        // loop through each of the PI's stories
        for (storyNdx = 0; storyNdx < nbrStories; storyNdx++) {
            aStory = records[storyNdx];

            if (aStory !== null) {

                aRelease = null;

                aRelease = this._findReleaseEntry(this.gPiReleases, aStory.Release);

                if (aRelease === null) {

                    // populate initial entry for this release
                    aRelease = new Object();

                    aRelease.itsStoryCount = 0;
                    aRelease.itsStoryPlanEstimate = 0;
                    aRelease.itsStoryCountAccepted = 0;
                    aRelease.itsStoryPlanEstimateAccepted = 0;

                }


                if (!aStory.get("Release")) {
                    aRelease.itsOID = "Not Scheduled";
                }
                else {
                    aRelease.itsOID = aStory.get("Release");
                }

                aRelease.itsStoryCount += 1;
                aRelease.itsStoryPlanEstimate += aStory.get("PlanEstimate") || 0;

                if (aStory.get("ScheduleState") === "Accepted") {
                    aRelease.itsStoryCountAccepted += 1;
                    aRelease.itsStoryPlanEstimateAccepted += aStory.get("PlanEstimate") || 0;
                }

                this.gPiReleases.push(aRelease);


            } // end process this story

        } // end loop through all stories


        // process the PI's releases data
        this._processPiReleases();

        // fetch release names (we need to convert Release OIDs from the LBAPI to logical Release names)
        this._fetchReleaseNames();

        // --- END BUCKET TIME BABY ---


    }, // end _processPiStories

    _processPiReleases:function () {

        var nbrReleases = this.gPiReleases.length;

        var releaseNdx;
        var aRelease;

        // loop through each of the PI's releases
        for (releaseNdx = 0; releaseNdx < nbrReleases; releaseNdx++) {

            aRelease = this.gPiReleases[releaseNdx];

        } // end loop through each of the PI's releases

    }, // end _processPiReleases


    // fetch all release names (we may later have to scale this back and do this more efficiently)
    _fetchReleaseNames:function () {

        var store = Ext.create('Rally.data.WsapiDataStore', {
            model:'Release',

            fetch:["ObjectID", "Name"],
            // scope globally
            context:{
                project:null
            },
            limit:Infinity,
            autoLoad:true,
            listeners:{
                load:function (store, data, success) {
                    // map release OIDs to release NAMES
                    this._mapReleaseOIDsToNames(store, data);

                },
                scope:this
            }
        });

    }, // end _fetchReleaseNames


    _mapReleaseOIDsToNames:function (theStore, allReleaseRecords) {
        var releaseNamesByObjectId = {};

        // create a hash of all WSAPI release OIDs to their Name
        Ext.Array.each(allReleaseRecords, function (releaseRecord) {
            releaseNamesByObjectId[releaseRecord.get("ObjectID")] = releaseRecord.get("Name");
        });


        // loop through each PI's release object and set its name from the OID/Name hash
        Ext.Array.each(this.gPiReleases, function (piRelease) {
            piRelease.itsName = releaseNamesByObjectId[piRelease.itsOID];

            if (!piRelease.itsName) {
                piRelease.itsName = "Unscheduled";
            }
        });

        // bucket PI's releases by NAME (accounts for roll-up releases) into the summedPisByReleaseName object
        var summedPisByReleaseName = {};

        Ext.Array.each(this.gPiReleases, function (piRelease) {
            if (!Ext.isObject(summedPisByReleaseName[piRelease.itsName])) {
                summedPisByReleaseName[piRelease.itsName] = piRelease;

                // localize summed release entry
                var summedRelease = summedPisByReleaseName[piRelease.itsName];
            }
            else {
                // localize summed release entry
                var summedRelease = summedPisByReleaseName[piRelease.itsName];
                summedRelease.itsStoryCount += piRelease.itsStoryCount;
                summedRelease.itsStoryCountAccepted += piRelease.itsStoryCountAccepted;
                summedRelease.itsStoryPlanEstimate += piRelease.itsStoryPlanEstimate;
                summedRelease.itsStoryPlanEstimateAccepted += piRelease.itsStoryPlanEstimateAccepted;
            }
        });

        var arrayOfStuff = Ext.Object.getValues(summedPisByReleaseName);

        // chart PI's release meta data
        this._chartPiReleases(arrayOfStuff);

    }, // end _fetchReleaseNames


    // chart out the PI's bucketed by name releases
    _chartPiReleases:function (piSummaryDatas) {

        // define a custom  model
        var aModel = Ext.define('CustomStoryModel', {
            extend:'Ext.data.Model',
            fields:[
                {name:'itsName', type:'string'},
                {name:'itsOID', type:'int'},
                {name:'itsStoryCount', type:'int'},
                {name:'itsStoryCountAccepted', type:'int'},
                {name:'itsStoryPlanEstimate', type:'int'},
                {name:'itsStoryPlanEstimateAccepted', type:'int'}
            ]
        });

        // define a store built around the custom  model
        var aStore = Ext.create('Ext.data.Store', {
            storeId:'piReleaseStore',
            model:aModel,
            data:piSummaryDatas
        });


        // define a rally grid to output the store's data in
        var aPiReleaseGrid = Ext.create('Rally.ui.grid.Grid', {
            itemId:'piReleaseGrid',
            store:aStore,
            width:470,
            columnCfgs:[
                {
                    text:'Release', dataIndex:'itsName', flex:2
                },
                //{
                //    text: 'Release ID', dataIndex: 'itsOID', flex: 1
                //},
                {
                    text:'Story Count Total', dataIndex:'itsStoryCount', width:80
                },
                {
                    text:'Story Count Accepted', dataIndex:'itsStoryCountAccepted', width:80
                },
                {
                    text:'Plan Estimate Total', dataIndex:'itsStoryPlanEstimate', width:80
                },
                {
                    text:'Plan Estimate Accepted', dataIndex:'itsStoryPlanEstimateAccepted', width:80
                }
            ] // end columnCfgs
        });


        // render the grid of all of the PI's leaf stories
        var aPiReleaseGridContainer = this.down('#piReleaseGridContainer');
        aPiReleaseGridContainer.removeAll(true);
        aPiReleaseGridContainer.add(aPiReleaseGrid);

        this._makeChart(piSummaryDatas);
    }, // end _chartPiReleases


    _findReleaseEntry:function (theArr, theReleaseOID) {

        // check if array is empty
        if (this.gReleaseArray === null)
            return null;


        arrLen = theArr.length;

        for (x = 0; x < arrLen; x++) {
            var anEntry = theArr[x];

            if (anEntry.itsOID == theReleaseOID) {
                return anEntry
            }
        }
        return null;
    }, // end _findReleaseEntry


    _makeChart:function (releaseSummaries) {
        console.log(releaseSummaries);
        var categories = [];
        var storyPlanEstimates = [];
        var storyPlanEstimateAccepted = [];
        var storyPlanEstimatesNotAccepted = [];
        Ext.Array.each(releaseSummaries,function(summary)
            {
                categories.push(summary.itsName);
                storyPlanEstimatesNotAccepted.push(summary.itsStoryPlanEstimate - summary.itsStoryPlanEstimateAccepted);
                storyPlanEstimateAccepted.push(summary.itsStoryPlanEstimateAccepted)
            }
        );
        this.insert(1,
            {
                xtype:'rallychart',
                height:400,
                chartConfig:{
                    chart:{
                        type: 'bar'
                    },
                    title:{
                        text:'Portfolio Item By Release',
                        align:'center'
                    },
                    xAxis:[
                        {
                            categories:categories,
                            title:{
                                text:'Release'
                            }
                        }
                    ],
                    yAxis:{
                        title:{
                            text:'Points'
                        }
                    },
                    series:[
                        {
                            stacking: 'normal',
                            data:storyPlanEstimateAccepted
                        },

                        {
                            stacking: 'normal',
                            data:storyPlanEstimatesNotAccepted
                        }
                    ]
                }
            });
    }

});
