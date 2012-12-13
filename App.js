// return all leaf stories of a hard-coded PI object ID


Ext.define('CustomApp', {
    extend:'Rally.app.App',
    componentCls:'app',
    layout:{
        type:'vbox',
        align:'stretch'
    },
    items:[

        { // define a container to house the PI combo box selector
            xtype:'container',
            itemId:'piChooserContainer',
            padding:'15 15 15 15' // top ? bottom left
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


    launch:function () {

        Ext.create('Rally.ui.dialog.ChooserDialog',{
            artifactTypes:['PortfolioItem/Feature'],
            autoShow:true,
            title:'Choose Feature',
            listeners:{
                artifactChosen:function (selectedRecord) {
                    //Ext.Msg.alert('Chooser', selectedRecord.get('Name') + ' was chosen');
                    this._getLeafStoriesInPi(selectedRecord.get('ObjectID'));
                },
                scope:this
            }
        });


    }, // end launch


    // reset the page's controls
    _reset:function () {
        this.gPiStories = [];
        //this._outstandingQueries = 0;
        this.down('#piLeafStoryGridContainer').removeAll();
    },


    // after PI selected, query for all its leaf level stories
    _getLeafStoriesInPi:function (piObjectID) {

        this._reset();

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
            fetch:find,
            rawFind:query,
            hydrate: ["ScheduleState"],
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
        console.log("nbrStories: " + nbrStories);

        var storyNdx;

        // loop through each of the PI's stories
        for (storyNdx = 0; storyNdx < nbrStories; storyNdx++){
            aStory = records[storyNdx];

            if (aStory !== null){

                console.dir(aStory);
                console.log("aStory" + aStory);
                console.log("aStory" + aStory.get("Name"));
                console.log("aStory.PlanEstimate: " + aStory.get("PlanEstimate"));
                console.log("aStory.Release: " + aStory.get("Release"));
                console.log("aStory.ScheduleState: " + aStory.get("ScheduleState"));

                aRelease = null;

                aRelease = this._findReleaseEntry(this.gPiReleases, aStory.Release);

                if (aRelease === null){

                    // populate initial entry for this release
                    aRelease = new Object();

                    aRelease.itsStoryCount = 0;
                    aRelease.itsStoryPlanEstimate = 0;
                    aRelease.itsStoryCountAccepted = 0;
                    aRelease.itsStoryPlanEstimateAccepted = 0;

                }


                if (aStory.Release === null){
                    aRelease.itsOID = "Not Scheduled";
                }
                else{
                    aRelease.itsOID = aStory.get("Release");
                }

                aRelease.itsStoryCount += 1;
                aRelease.itsStoryPlanEstimate += aStory.get("PlanEstimate");

                if (aStory.get("ScheduleState") === "Accepted"){
                    aRelease.itsStoryCountAccepted += 1;
                    aRelease.itsStoryPlanEstimateAccepted += aStory.get("PlanEstimate");
                }

                this.gPiReleases.push(aRelease);


            } // end process this story

        } // end loop through all stories


        // process the PI's releases data
        this._processPiReleases();

        // chart PI's release meta data
        this._chartPiReleases();

        // --- END BUCKET TIME BABY ---


    }, // end _processPiStories

    _processPiReleases: function() {

        var nbrReleases = this.gPiReleases.length;
        console.log("nbrReleases: " + nbrReleases);

        var releaseNdx;
        var aRelease;

        // loop through each of the PI's releases
        for (releaseNdx = 0; releaseNdx < nbrReleases; releaseNdx++){

            aRelease = this.gPiReleases[releaseNdx];

            if (aRelease !== null){

                console.dir(aRelease);
                console.log("aRelease.itsOID: " + aRelease.itsOID);
                console.log("aRelease.itsStoryCount: " + aRelease.itsStoryCount);
                console.log("aRelease.itsStoryPlanEstimate: " + aRelease.itsStoryPlanEstimate);
                console.log("aRelease.itsStoryCountAccepted: " + aRelease.itsStoryCountAccepted);
                console.log("aRelease.itsStoryPlanEstimateAccepted: " + aRelease.itsStoryPlanEstimateAccepted);
            }

        } // end loop through each of the PI's releases

    }, // end _processPiReleases


    // bucket the PI's stories by RELEASE (and no release)
    _processPiStories:function () {

//        // spit out all leaf stories into a grid
//        var snapshotGrid = Ext.create('Rally.ui.grid.Grid', {
//            title:'Snapshots',
//            store:store,
//            columnCfgs:[
//                {
//                    text:'ObjectID',
//                    dataIndex:'ObjectID'
//                },
//                {
//                    text:'Name',
//                    dataIndex:'Name'
//                },
//                {
//                    text:'Project',
//                    dataIndex:'Project'
//                },
//                {
//                    text:'_UnformattedID',
//                    dataIndex:'_UnformattedID'
//                },
//                ,
//                {
//                    text:'Release',
//                    dataIndex:'Release'
//                }
//            ],
//            height:400
//        });
//
//        // render the grid of all of the PI's leaf stories
//        var gridHolder = this.down('#piLeafStoryGridContainer');
//        gridHolder.removeAll(true);
//        gridHolder.add(snapshotGrid);




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
    } // end _findReleaseEntry

});
