
var query = {
    "__At": "current",
    "_TypeHierarchy":"HierarchicalRequirement",
    "Children":null,
    "_ItemHierarchy":7689990600
};
var find = ["ObjectID","_UnformattedID", "Name","Release"];
var queryString = Ext.JSON.encode(query);
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items:[
        {
            xtype: 'panel',
            layout: 'anchor',
            border: true,
            fieldDefaults: {
                labelWidth: 40
            },
            defaultType: 'textfield',
            bodyPadding: 5,
            
            
            buttons: [
                {
                    xtype: 'rallybutton',
                    text: 'Go',
                    itemId: 'goButton'
                }
            ]
        },
        {
            xtype: 'panel',
            itemId: 'gridHolder',
            layout: 'fit',
            height: 400
        }
    ],
    launch: function() {
        var button = this.down('#goButton');
        button.on('click', this.goClicked, this);
    },
    
    goClicked: function(){
        var transformStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            context: {
                workspace: this.context.getWorkspace(),
                project: this.context.getProject()
            },
            fetch: find,
            rawFind: query,
            autoLoad: true,
            listeners: {
                scope: this,
                load: this.processSnapshots
            }
        });
    },

    
    processSnapshots: function(store, records){
        var snapshotGrid = Ext.create('Rally.ui.grid.Grid', {
            title: 'Snapshots',
            store: store,
            columnCfgs: [
                {
                    text: 'ObjectID', 
                    dataIndex: 'ObjectID'
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name'
                },
                {
                    text: 'Project',
                    dataIndex: 'Project' 
                },
                {
                    text: '_UnformattedID',
                    dataIndex: '_UnformattedID'
                },
                ,
                {
                    text: 'Release',
                    dataIndex: 'Release'
                }
            ],
            height: 400
        });
        
        var gridHolder = this.down('#gridHolder');
        gridHolder.removeAll(true);
        gridHolder.add(snapshotGrid);
    }
});
