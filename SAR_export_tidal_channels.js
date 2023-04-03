// Code to generate SAR GeoTIFF images for Glencaple tidal channel, in the Solway. 
// User input requested for image date.

var Glencaple = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-3.6148796591424226, 55.05591437946563],
          [-3.605609944786954, 55.027783939330945],
          [-3.5846672567986726, 54.99608895846439],
          [-3.593250325646329, 54.9643689216026],
          [-3.594623616661954, 54.93755482681373],
          [-3.585353902306485, 54.91802449080304],
          [-3.5256157431267976, 54.90263027422423],
          [-3.4679375204705476, 54.9253248169857],
          [-3.4912834677361726, 54.96535439300006],
          [-3.527098834538398, 54.97522459050106],
          [-3.5549079776048043, 54.98960618494107],
          [-3.5652076602219918, 55.001225900970965],
          [-3.587438079977572, 55.03196348149251]]]);

function maskS1(image) { 
    var vv = image.select('VV');
    var vh = image.select('VH');
    var mask = vv.neq(0);       //Select only data, that is not equal to 0 (== usually image boarder)
    var mask_vh = vh.lte(-18);  //Select only data, that is not equal to 0 (== usually image boarder)
    
    //Return masked data and copy image properties
    var tmp = image.updateMask(mask).select("VV").copyProperties(image, ["system:time_start"]);
    return image.updateMask(mask_vh).select("VV").copyProperties(tmp, ["system:time_start"]);
}

function maskS1_vv(image) { 
    var vv = image.select('VV');
    var mask = vv.neq(0); //Select only data, that is not equal to 0 (== usually image boarder)
    //Return masked data and copy image properties
    return image.updateMask(mask).select("VV").copyProperties(image, ["system:time_start"]);
}

function clipping(image) {
  return image.clip(aoi); // Crops images to area of interest
}

function mask_and_clip(s1) {
  var s1_clip = s1.map(clipping);

  var s1_masked = s1_clip.map(maskS1);
  var s1_masked_vv = s1_clip.map(maskS1_vv);
  
  var mosaic_s1 =s1_masked.mosaic().clip(aoi);
  var mosaic_s1_vv =s1_masked_vv.mosaic().clip(aoi);
  return [mosaic_s1,mosaic_s1_vv]
}

function addImage(image) { // display each image in collection
  var id = image.id;
  var image2 = ee.Image(image.id);
  Map.addLayer(image2,{min:-30,max:30})
}

function addColorBarLegend(title, palette, min, max, image, layerName) { // Define a function to create a color bar legend
  var visParams = {
    min: min,
    max: max,
    palette: palette
  };
  // Legend Title
  var titleWidget = ui.Label({
    value: title, 
    style: {
      fontWeight: 'bold', 
      textAlign: 'center', 
      stretch: 'horizontal'
    }
  });

  // Colorbar
  var legend = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
      bbox: [0, 0, 1, 0.1],
      dimensions: '200x20',
      format: 'png', 
      min: 0, 
      max: 1,
      palette: palette
    },
    style: {
      stretch: 'horizontal', 
      margin: '8px 8px', 
      maxHeight: '40px'
    }
  });
  
  // Legend Labels
  var labels = ui.Panel({
    widgets: [
      ui.Label(min, {margin: '4px 10px',textAlign: 'left', stretch: 'horizontal'}),
      ui.Label((min+max)/2, {margin: '4px 20px', textAlign: 'center', stretch: 'horizontal'}),
      ui.Label(max, {margin: '4px 10px',textAlign: 'right', stretch: 'horizontal'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  
  // Create a panel with all 3 widgets
  var legendPanel = ui.Panel({
    widgets: [titleWidget, legend, labels],
    style: {position: 'bottom-center', padding: '8px 15px'}
  });
  
  // Add the legend panel to the map
  Map.add(legendPanel);
  
  // Add the image layer to the map
  Map.addLayer(image, visParams, layerName);
}

function export_image(img,date,region) {
  Export.image.toDrive({
  image: img,
  description: date.toISOString().substring(0, 10) + "_Glencaple",
  scale: 5,
  crs: 'EPSG:32630',
  region: region,
  });
}

//////////////// CODE ////////////////

// Area of Interest
var aoi = Glencaple; 

// User defined time period
var startDate = new Date('2023-04-01');
var endDate = new Date(startDate);
endDate.setDate(startDate.getDate() + 1);

// Select S1 IW images in area of interest and time period
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD').filterMetadata('instrumentMode', 'equals', 'IW')
                                                .filterBounds(aoi)
                                                .filterDate(startDate, endDate);
print(s1);

var result = mask_and_clip(s1);   // clip to AOI and mask
var mosaic_s1 = result[0];        // VH mask applied
var mosaic_s1_vv = result[1];     // no mask

export_image(mosaic_s1,startDate,Glencaple)
export_image(mosaic_s1_vv,startDate,Glencaple)

// Call the function to add a color bar legend and image layer to the map
addColorBarLegend('Backscatter Intensity', ['black', 'white'], -30, 0, mosaic_s1, 'sentinel 1 original');
