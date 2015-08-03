var svg;
var linesvg;
var xScale;
var yScale;
d3.json("elevation.geojson", function(json) {
        //Retrieve array of elevation info from json file
        var elevation_data = json.features[0].properties.elevation;
        //Retrieve array of points from json file
        var coordinates = json.features[0].geometry.coordinates;
        //Calculate distances between points
        var distances = [];
        for (var i = 0; i < coordinates.length - 1; i++) {
            var j = i + 1;
            var x1 = coordinates[i][0]; //lon
            var y1 = coordinates[i][1]; //lat
            var x2 = coordinates[j][0]; //lon
            var y2 = coordinates[j][1]; //lat
            var d = getDistanceFromLatLonInKm(y1, x1, y2, x2);
            //var d = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
            distances.push(d);
        }

        //Calculate x y points to graph based on elevations and distances
        var data = [];
        var data_zero = [];
        var line_endpoints = [];
        var line_endpoints_zero = [];
        var curr_x = 0;
        var counter = 0;
        while (elevation_data.length > 0) {
            curr_y = elevation_data.shift();
            data.push([curr_x, curr_y, coordinates[counter][0], coordinates[counter][1]]);
            data_zero.push([curr_x, 0, coordinates[counter][0], coordinates[counter][1]]);
            counter++;
            curr_x = curr_x + distances.shift();
        }
        //Also calculate endpoints for lines connecting the points

        for (var i = 0; i < data.length - 1; i++) {
            var j = i + 1;
            line_endpoints.push([data[i][0], data[i][1], data[j][0], data[j][1]]);
            line_endpoints_zero.push([data[i][0], 0, data[j][0], 0]);
        }

        //Data to plot is now stored in `data`; begin plotting
        var w = document.getElementById("elevation-graph").offsetWidth;
        var h = document.getElementById("elevation-graph").offsetHeight;
        var padding = 50;
        var point_radius = 0.01;
        var lineFunction = d3.svg.line()
            .x(function(d) {
                return xScale(d[0]);
            })
            .y(function(d) {
                return yScale(d[1]);
            })
            .interpolate("cardinal");

        xScale = d3.scale.linear()
            .domain([0, d3.max(data, function(d) {
                return d[0];
            })])
            .range([padding, w - padding * 2]);
        yScale = d3.scale.linear()
            .domain([0, d3.max(data, function(d) {
                return d[1];
            })])
            .range([h - padding, padding]);
        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .ticks(5);
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .ticks(2);
        svg = d3.select("#elevation-graph")
            .append("svg")
            .attr("width", w)
            .attr("height", h);


        svg.selectAll("circle")
            .data(data_zero)
            .enter()
            .append("circle")
            .attr("clip-path", "url(#chart-area)")
            .attr("id", function(d, i) {
                return "circle" + i;
            })
            .attr("cx", function(d) {
                return xScale(d[0]);
            })
            .attr("cy", function(d) {
                return yScale(d[1]);
            })
            .attr("r", point_radius)
            .attr("class", "point")
			.attr("class", "originalpoint")
            .on("mouseover", function(d, i) {
                //When a point on the graph is clicked, plot the correspoinding point on the map
                var lon = coordinates[i][0];
                var lat = coordinates[i][1];
                console.log(lon, lat);
                var newPoint = [{
                    "type": "Point",
                    "coordinates": [lon, lat]
                }];
                geoJsonLayer.addData(newPoint);
                var latlng = L.latLng(lat, lon);
                var layerPoint = map.latLngToContainerPoint(latlng);
                //Plot a line to 0, 0
                var linedata = [
                    [layerPoint.x, layerPoint.y],
                    [0, 0]
                ];
                linesvg
                    .append("line")
                    .attr("x1", function(d) {
                        return linedata[0][0];
                    })
                    .attr("y1", function(d) {
                        return linedata[0][1];
                    })
                    .attr("x2", function(d) {
                        return linedata[1][0];
                    })
                    .attr("y2", function(d) {
                        return linedata[1][1];
                    })
                    .attr("style", "stroke:rgb(255,0,0);stroke-width:5");
                console.log(layerPoint);
            })
            .on("mouseout", function(d, i) {
                //When a point on the graph is clicked, plot the correspoinding point on the map

                geoJsonLayer.clearLayers();
                geoJsonLayer = L.geoJson(freeBus, {
                    onEachFeature: function(feature, layer) {
                        layer.on('mousemove', function(e) {
                            //If user hovers over the line on the map
                            //Get coordinates associated with hover pointer
                            var mouselat = e.latlng.lat;
                            var mouselng = e.latlng.lng;
                            //Get the point on the graph closest to the mouse location
							unhighlightPoint();
                            highlightPoint(mouselat, mouselng);


                        });
                        layer.on('mouseout', function(e) {
                            unhighlightPoint();

                        });
                    }

                }).addTo(map);
            });
        //X axis label
        svg.append("text")
            .attr("class", "xlabel")
            .attr("text-anchor", "end")
            .attr("x", w / 2 + 30)
            .attr("y", h - 30)
            .text("Distance (km)");
        svg.append("text")
            .attr("class", "ylabel")
            .attr("text-anchor", "middle")
            .attr("x", -h / 2)
            .attr("y", padding - 30)
            .attr("transform", "rotate(-90)")
            .text("Elevation (m)");
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + (h - padding - 20) + ")")
            .call(xAxis);
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);
        lineGraph = svg.append("path")
            .attr("d", lineFunction(data))
            .attr("stroke", "blue")
            .attr("stroke-width", 5)
            .attr("id", "graphline")
            .attr("fill", "none");
        var totalLength = lineGraph.node().getTotalLength();
        lineGraph
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease("linear")
            .attr("stroke-dashoffset", 0);
        //Define clipping path
        svg.append("clipPath") //Make a new clipPath
            .attr("id", "chart-area") //Assign an ID
            .append("rect") //Within the clipPath, create a new rect
            .attr("x", padding - 10) //Set rect's position and size�
            .attr("y", padding - 20)
            .attr("width", w - padding * 2)
            .attr("height", h - padding * 2);
        svg.selectAll("#graphline").on('mouseout', function() {
            geoJsonLayer.clearLayers();
			geoJsonLayer = L.geoJson(freeBus, {
                    onEachFeature: function(feature, layer) {
                        layer.on('mousemove', function(e) {
                            //If user hovers over the line on the map
                            //Get coordinates associated with hover pointer
                            var mouselat = e.latlng.lat;
                            var mouselng = e.latlng.lng;
                            //Get the point on the graph closest to the mouse location
							unhighlightPoint();
                            highlightPoint(mouselat, mouselng);


                        });
                        layer.on('mouseout', function(e) {
                            unhighlightPoint();

                        });
                    }

                }).addTo(map);
            geoJsonLayer = L.geoJson(freeBus, {
                onEachFeature: function(feature, layer) {
                    layer.on('mousemove', function(e) {
                        //If user hovers over the line on the map
                        //Get coordinates associated with hover pointer
                        var mouselat = e.latlng.lat;
                        var mouselng = e.latlng.lng;
                        //Get the point on the graph closest to the mouse location
						unhighlightPoint();
                        highlightPoint(mouselat, mouselng);


                    });
                    layer.on('mouseout', function(e) {
                        unhighlightPoint();

                    });
                }

            }).addTo(map);
        });
		var previousinterpolatedpoint;
        svg.selectAll("#graphline").on('mousemove', function() {
			//remove previous point, if it exists
			geoJsonLayer.clearLayers();
            var coordinates = [0, 0];
            coordinates = d3.mouse(this);
            console.log(coordinates);

            var neighborid = 0;
            svg.selectAll(".originalpoint").each(function(d, i) {
                var pointX = d3.select(this).attr("cx");

                if (pointX > coordinates[0]) {
                    return;
                }

                neighborid++;

            });

            //select the right neighbor and get its coordinates, both on the chart and geographically
            neighboridString = "#circle" + neighborid;

            var rightneighborCoords = [0, 0];
            var rightneighborGeoCoords = [0, 0];

            svg.selectAll(neighboridString).each(function(d, i) {
                rightneighborCoords = [d3.select(this).attr("cx"), d3.select(this).attr("cy")];
                rightneighborGeoCoords = [d[3], d[2]];
            });

            //repeat the process for the left neighbor
            neighboridString = "#circle" + (neighborid - 1);
            console.log("left neighbor id string is " + neighboridString);
            var leftneighborCoords = [0, 0];
            var leftneighborGeoCoords = [0, 0];
            svg.selectAll(neighboridString).each(function(d, i) {
                leftneighborCoords = [d3.select(this).attr("cx"), d3.select(this).attr("cy")];
                leftneighborGeoCoords = [d[3], d[2]];
            });

            //calculate distance between left neighbor and right neighbor on the graph
            var x1 = leftneighborCoords[0];
            var y1 = leftneighborCoords[1];
            var x2 = rightneighborCoords[0];
            var y2 = rightneighborCoords[1];
            var graphDistNeighbors = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            //calculate distance between mouse and left neighbor on the graph
            x2 = coordinates[0];
            y2 = coordinates[1];
            var mouseToLeftNeighborDist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            //calculate mouse cursor's fractional position on line between left and right neighbor
            var mouseFractionPosition = mouseToLeftNeighborDist / graphDistNeighbors;

            //finally calculate the geographic coordinates this would correspond to
            //calculate distance between the geographic coordinates of left and right neighbor
            x1 = leftneighborGeoCoords[0];
            y1 = leftneighborGeoCoords[1];
            x2 = rightneighborGeoCoords[0];
            y2 = rightneighborGeoCoords[1];
            var geoNeighborsDistance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            //calculate distance to move from the left neighbor
            var distanceToMove = mouseFractionPosition * geoNeighborsDistance;
            var resultX = x1 + (distanceToMove / geoNeighborsDistance) * (x2 - x1);
            var resultY = y1 + (distanceToMove / geoNeighborsDistance) * (y2 - y1);
            //plot a new geojson point at this location

            var interpolatedPoint = [{
                "type": "Point",
                "coordinates": [resultY, resultX]
            }];
			previousinterpolatedpoint = interpolatedPoint;
            geoJsonLayer.addData(interpolatedPoint);

        });
        svg.selectAll("circle")
            .data(data)
            .transition()
            .duration(1000)
            .delay(function(d, i) {
                return i * 50;
            })
            .attr("cy", function(d) {
                return yScale(d[1]);
            })
            /*
            lineGraph.attr("d", lineFunction(data))
            	.transition()
            	.duration(500)
            	.delay(5000);
            */
        linesvg = d3.select("body")
            .append("svg")
            .attr("width", window.innerWidth)
            .attr("height", window.innerHeight);


    })
    //http://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates-shows-wrong
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}
var highlightid = -1;

function unhighlightPoint() {
	
    svg.selectAll(".insertedpoint")
        .attr("r", 0.001);
		
}

function highlightPoint(mouselat, mouselng) {

    //find the IDs of the two closest neighbors
    var foundindexes = false;
    var index1 = 0;
    var index2 = 1;
    while (!foundindexes) {
        svg.selectAll("#circle" + index1).each(function(circle1data) {
            svg.selectAll("#circle" + index2).each(function(circle2data) {
                var circle1lat = circle1data[3];
                var circle1lng = circle1data[2];
                var circle2lat = circle2data[3];
                var circle2lng = circle2data[2];
                //check if the mouse lies between these two points
                var distBetweenPoints = Math.sqrt((circle2lat - circle1lat) * (circle2lat - circle1lat) + (circle2lng - circle1lng) * (circle2lng - circle1lng));
                var distMouse2c1 = Math.sqrt((mouselat - circle1lat) * (mouselat - circle1lat) + (mouselng - circle1lng) * (mouselng - circle1lng));
                var distMouse2c2 = Math.sqrt((circle2lat - mouselat) * (circle2lat - mouselat) + (circle2lng - mouselng) * (circle2lng - mouselng));
                var tolerance = 0.00005;
                if ((distMouse2c1 + distMouse2c2 > distBetweenPoints - tolerance) && (distMouse2c1 + distMouse2c2 < distBetweenPoints + tolerance)) {
                    foundindexes = true;
                }
            })
        });
        if (!foundindexes) {
            index1++;
            index2++;
        }
        //infinite loop protection
        if (index2 > 50) {
            foundindexes = true;
        }
    }
	console.log("neighbor ids");
	console.log(index1, index2);
	var neighbor1GeoCoords = [0, 0];
	var neighbor1GraphCoords = [0, 0];
	var neighbor2GeoCoords = [0, 0];
	var neighbor2GraphCoords = [0, 0];
	svg.selectAll("#circle"+index1).each(function(d){
		neighbor1GeoCoords = [d[3], d[2]];
		neighbor1GraphCoords = [d[0], d[1]];
	});
	svg.selectAll("#circle"+index2).each(function(d){
		neighbor2GeoCoords = [d[3], d[2]];
		neighbor2GraphCoords = [d[0], d[1]];
	});
	
	var x1 = neighbor1GeoCoords[0];
	var y1 = neighbor1GeoCoords[1];
	var x2 = neighbor2GeoCoords[0];
	var y2 = neighbor2GeoCoords[1];
	
	var geoDistNeighbors = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
	x2 = mouselat;
	y2 = mouselng;
	console.log(x1, y1, x2, y2);
	var mouseToNeighbor1Dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
	var mouseFractionPosition = mouseToNeighbor1Dist / geoDistNeighbors;
	//calculate distance between the neighbors on the graph
	x1 = neighbor1GraphCoords[0];
	y1 = neighbor1GraphCoords[1];
	x2 = neighbor2GraphCoords[0];
	y2 = neighbor2GraphCoords[1];
	console.log("mouse fraction position");
	console.log(mouseFractionPosition);
	var neighborsDistOnGraph = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
	var distanceToMove = mouseFractionPosition * neighborsDistOnGraph;
	
	var resultX = x1 + (distanceToMove / neighborsDistOnGraph) * (x2 - x1);
    var resultY = y1 + (distanceToMove / neighborsDistOnGraph) * (y2 - y1);
	
	var newcircle = svg.append("circle")
		.attr("class", "point")
		.attr("cx", xScale(resultX))
		.attr("cy", yScale(resultY))
		.attr("r", 6.5)
		.attr("class", "insertedpoint");
	
    console.log("Found placement location!");
	console.log(xScale(resultX), yScale(resultY));
	//add new circle to svg
	
    /*
	var mousecoordinates = [mouselng, mouselat];
	
           
            console.log(mousecoordinates);

            var neighborid = 0;
            svg.selectAll("circle").each(function(d, i) {
                var pointX = d[2];

                if (pointX > mousecoordinates[0]) {
                    return;
                }

                neighborid++;

            });
			console.log("neighbor id is "+neighborid);

            //select the right neighbor and get its coordinates, both on the chart and geographically
            neighboridString = "#circle" + neighborid;

            var rightneighborCoords = [0, 0];
            var rightneighborGeoCoords = [0, 0];

            svg.selectAll(neighboridString).each(function(d, i) {
                rightneighborCoords = [d3.select(this).attr("cx"), d3.select(this).attr("cy")];
                rightneighborGeoCoords = [d[3], d[2]];
            });
			console.log(rightneighborCoords);
			*/

}

/*
function highlightPoint(mouselat, mouselng) {

    var minDist = 1000;
    var minDistLat = 0;
    var minDistLng = 0;
    var minDistId = -1;
    svg.selectAll("circle").each(function(dval, i) {

        //Find the point whose geographic location corresponds most closely to the
        //geographic location the mouse is hovering over
        var dist = Math.sqrt((mouselat - dval[3]) * (mouselat - dval[3]) + (mouselng - dval[2]) * (mouselng - dval[2]));
        if (dist < minDist) {
            minDist = dist;
            minDistLat = dval[3];
            minDistLng = dval[2];
            highlightid = i;
            minDistId = "circle" + i;
        }


    });
    //console.log(mouselat, mouselng);
    //console.log(minDist);
    //console.log(minDistLat);
    //console.log(minDistLng);
    //console.log(minDistId);
    svg.selectAll("#" + minDistId)
        .attr("r", 20);




}
*/
function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function findNeighboringPoints(mouseX, mouseY) {
    //iterate through each point until the X value of each point is greater
    //than mouseX, return index of that point
    console.log("findneighboringpoints was called");
    var returnid = 0;
    svg.selectAll(".originalpoint").each(function(d, i) {
        var pointX = d3.select(this).attr("cx");

        if (pointX > mouseX) {
            console.log("returning " + returnid)
            return returnid;
        }

        returnid++;

    });
}