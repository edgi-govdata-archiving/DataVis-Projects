// Dimensions of sunburst.
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

var color = d3.scaleLinear()
	.interpolate(d3.interpolateHcl)
	.domain([0.2, 0.4, 0.6, 0.8, 1])
	.range([d3.rgb("#FF0000"), d3.rgb("#FF7F00"), d3.rgb("#FFFF00"), d3.rgb("#7FFF00"), d3.rgb("#00FF00")]);

var vis = d3.select("#chart").append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("svg:g")
		.attr("id", "container")
		.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.partition()
		.size([2 * Math.PI, radius * radius]);

var arc = d3.arc()
		.startAngle(function(d) { return d.x0; })
		.endAngle(function(d) { return d.x1; })
		.innerRadius(function(d) { return Math.sqrt(d.y0); })
		.outerRadius(function(d) { return Math.sqrt(d.y1); });

d3.json("coverage.json", function(error, root) {
	if (error) throw error;

	vis.append("svg:circle")
			.attr("r", radius)
			.style("opacity", 0);

	delete root.data.numLeaves;
	
	root = d3.hierarchy(root.data)
			.sum(function(d) { return d.numLeaves; })/*
			.sort(function(a, b) { return b.data.numLeaves - a.data.numLeaves; })*/; //used to be value.
	// For efficiency, filter nodes to keep only those large enough to see.
	var nodes = partition(root).descendants()
			.filter(function(d) {
				return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
			});

	var path = vis.data([root]).selectAll("path")
			.data(nodes)
			.enter().append("svg:path")
			.attr("display", function(d) { return d.depth ? null : "none"; })
			.attr("d", arc)
			.attr("fill-rule", "evenodd")
			.style("fill", function(d) { return color(d.data.numLeavesArchived/d.data.numLeaves); })
			.style("opacity", 1)
			.on("mouseover", mouseover)
			.each(stash)
				.transition()
				.duration(750)
				.attrTween("d", arcTween());

	// Add the mouseleave handler to the bounding circle.
	d3.select("#container").on("mouseleave", mouseleave);
});

function arcTween(){
	return function(d){
		var i = d3.interpolate(d.x0, d.x1);
		return function(t){
			d.x1 = i(t);
			return arc(d);
		};

	};
};
        
function stash(d) {
	/*
  d.x0 = 0; // d.x;
  d.x1 = 0; //d.dx;*/
};


/*
function click(d)
{
	d3.select("#container").selectAll("path").remove();
	
	var nodes = partition.nodes(d)
			.filter(function(d) {
			return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
			}) ;
	
	var path = vis.data([d]).selectAll("path")
			.data(nodes)
			.enter().append("svg:path")
			.attr("display", function(d) { return d.depth ? null : "none"; })
			.attr("d", arc)
			.attr("fill-rule", "evenodd")
			.style("fill", function(d) { return colors[d.name]; })
			.style("opacity", 1)
			.on("mouseover", mouseover)
			.on("click", click)
			.each(stash)
				.transition()
				.duration(750)
				.attrTween("d", arcTween);
	;

	// Get total size of the tree = value of root node from partition.
	totalSize = path.node().__data__.value;
}
*/
// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {
	console.log(d);

	// if the DEPTH is greater than one? //
	if(d.depth > 1){
		var percentage = (100 * d.data.numLeavesArchived / d.parent.data.numLeaves).toPrecision(3);
	} else {
		var percentage = (100 * d.data.numLeavesArchived / d.data.numLeaves).toPrecision(3);
	}

	var percentageString = percentage + "%";
	if (percentage < 0.1) {
		percentageString = "< 0.1%";
	}

	d3.select("#percentage")
			.text(percentageString);

	d3.select("#explanation")
			.style("visibility", "");

	d3.select("#website").text(d.data.name);

	var sequenceArray = d.ancestors().reverse();
	sequenceArray.shift();

	// Fade all the segments.
	d3.selectAll("path")
			.style("opacity", 0.3);

	// Then highlight only those that are an ancestor of the current segment.
	vis.selectAll("path")
			.filter(function(node) {
								return (sequenceArray.indexOf(node) >= 0);
							})
			.style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

	// Hide the breadcrumb trail
	d3.select("#trail")
			.style("visibility", "hidden");

	// Deactivate all segments during transition.
	d3.selectAll("path").on("mouseover", null);

	// Transition each segment to full opacity and then reactivate it.
	d3.selectAll("path")
			.transition()
			.duration(500)
			.style("opacity", 1)
			.on("end", function() {
							d3.select(this).on("mouseover", mouseover);
						});

	d3.select("#explanation")
			.transition()
			.duration(1000)
			.style("visibility", "hidden");
}