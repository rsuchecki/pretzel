import Ember from 'ember';

export default Ember.Route.extend({
  queryParams: {
    mapsToView: {
      // We want changes in the URL mapsToView query parameter to trigger
      // a model refresh.
      refreshModel: true
    },
    chr: {
      refreshModel: true
    }
  },

  serializeQueryParam: function(value, urlKey, defaultValueType) {
    // This serializes what gets passed to the link-to query parameter.
    // Without it, an array simply gets JSON.stringified, for example:
    // [1,2] becomes "[1,2]" and treated as a string.
    if (defaultValueType === 'array') {
      return value;
    }
    return '' + value;
  }, 

  deserializeQueryParam: function(value, urlKey, defaultValueType) {
    return value;
  },

  model(params) {

    // Get all available maps.
    let selMaps = [];
    let that = this;
    let retHash = {};
    let seenChrs = new Set();
    var maps = that.get('store').findAll('geneticmap').then(function(genmaps) {
	var map1 = genmaps.objectAt(1);
	var m1e = map1.get('extended');
	console.log("m1e=", m1e);
      that.controllerFor("mapview").set("availableMaps", genmaps);
      genmaps.forEach(function(map) {
        var exMaps = [];
        map.set('isSelected', false); // In case it has been de-selected.
        if (params.mapsToView) {
          for (var i=0; i < params.mapsToView.length; i++) {
            if (map.get('id') != params.mapsToView[i]) {
              exMaps.push(params.mapsToView[i]);
            }
            else {
              map.set('isSelected', true);
              selMaps.push(map);
              let mapName = map.get('name');
              retHash[mapName] = {};
		map.loadPartials().then(function(res, err) {
		    if (err)
		    { console.log("err=", err); }
		    else
		    {
			console.log("res=", res);
			var m = res.getProperties(res._partialDescriptors().mapBy('key'));
			console.log("m.extended=", m.extended);
			var myMap = m.extended.get("chromosomes");
			console.log("myMap=", myMap);
			if (myMap)
			{
			myMap.forEach(function(chr) {
                let chrName = chr.get('name');
                seenChrs.add(chrName);
                if (chrName == params.chr) {
                  retHash[mapName][mapName+"_"+chrName] = [];
                  chr.get('markers').forEach(function(marker) {
                    retHash[mapName][mapName+"_"+chrName].pushObject(
                      {"map": mapName+"_"+chrName,
                       "marker": marker.get('name'),
                       "location": marker.get('position')
                      }
                    );
                  });
                }
              });
			}
		    }
		});	// loadPartials()
            }
          }
        }
        map.set('extraMaps', exMaps);
      });
      that.controllerFor("mapview").set("availableChrs", Array.from(seenChrs).sort());
      that.controllerFor("mapview").set("selectedMaps", selMaps);
    });
    return retHash;
  }
});
