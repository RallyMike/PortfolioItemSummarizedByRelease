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


    // --- global variables ---
    gPiStories:[], // array to capture the list of all leaf stories in the PI

    gStoryGrid:undefined,

    _outstandingQueries:0, // count of recursive queries called
    // --- end global variables ---


    launch:function () {

        Ext.create('Rally.ui.dialog.ChooserDialog',{
            artifactTypes:['PortfolioItem/Feature'],
            autoShow:true,
            title:'Choose Feature',
            listeners:{
                artifactChosen:function (selectedRecord) {
                    Ext.Msg.alert('Chooser', selectedRecord.get('Name') + ' was chosen');
                    this._getLeafStoriesInPi(selectedRecord.get('ObjectID'));
                },
                scope:this
            }
        });


    }, // end launch


    processSnapshots:function (store, records) {
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

        var gridHolder = this.down('#piLeafStoryGridContainer');
        gridHolder.removeAll(true);
        gridHolder.add(snapshotGrid);
    },


    // reset the page's controls
    _reset:function () {
        this.gPiStories = [];
        //this._outstandingQueries = 0;
        this.down('#piLeafStoryGridContainer').removeAll();
    },


    // after PI selected, query for all its stories
    _getLeafStoriesInPi:function (piObjectID) {
        this._reset();

        var query = {
            "__At":"current",
            "_TypeHierarchy":"HierarchicalRequirement",
            "Children":null,
            "_ItemHierarchy":piObjectID
        };

        // set query config info
        var find = ["ObjectID", "_UnformattedID", "Name", "Release"];

        var queryString = Ext.JSON.encode(query);

        var context = this.getContext().getDataContext();
        context.project = undefined;


        var ssPiLeafStories = Ext.create('Rally.data.lookback.SnapshotStore', {
            context:{
                workspace:this.context.getWorkspace(),
                project:this.context.getProject()
            },
            fetch:find,
            rawFind:query,
            autoLoad:true,
            listeners:{
                scope:this,
                load:this.processSnapshots
            }
        });


    } // end _getStoriesInPi

});
