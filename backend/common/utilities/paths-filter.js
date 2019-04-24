var _ = require('lodash')

/* global exports */

var trace_filter = 1;

/**
 * filter paths according to intervals.axes[].domain[]
 * 
 * Use pathsAggr.densityCount(), with some changes : instead of totalCounts[], can simply count the paths.
 * When streaming, i.e. called from pathsViaStream(), skip the densityCount() and nthSample() because they don't apply.
 * pathsViaStream() calls filterPaths() with paths.length === 1, and even when
 * not streaming there doesn't seem much point in densityCount() and nthSample()
 * when paths.length === 1, so this is used as the indicator condition for
 * skipping those function.
*/
function filterPaths(domainFilterData, paths, intervals) {
  let trace_save;
  if (intervals.trace_filter) {
    trace_save = trace_filter;
    trace_filter = intervals.trace_filter;
  }
  // pathsViaStream() calls .filterPaths() once for each path
  if (trace_filter > (2 - (paths.length > 1))) {
    // console.log('paths, intervals => ', paths, intervals);
    console.log('paths.length => ', paths.length);
    console.log('intervals.axes[0].domain => ', intervals.axes[0].domain);
    console.log('intervals.axes[1].domain => ', intervals.axes[1].domain);
  }

  let filteredPaths
  if (filterDomain(intervals, 0) || filterDomain(intervals, 1))
    filteredPaths = domainFilterData(paths, intervals);
  else
    filteredPaths = paths;

  filteredPaths = densityFilter(filteredPaths, intervals);

  if (trace_save)
    trace_filter = trace_save;
  return filteredPaths;
};
exports.filterPaths = function(paths, intervals) {
  return filterPaths(domainFilter, paths, intervals);
};
exports.filterPathsAliases = function(paths, intervals) {
  return filterPaths(domainFilterPathAliases, paths, intervals);
};


/** The domain may be provided when the full axis is displayed, i.e. before
 * zooming in.
 * The domain may be derived from the range of the reference / parent block,
 * and in the case of data inconsistency may not encompass the locations of
 * all the features in this child data block.  So ignore the
 * intervals.axes[].domain[] given in the request if .zoomed is not true.
 *
 * @param i block index, i.e. index of the block within the request params.
 * @return true if the request indicates
 */
function filterDomain(intervals, i) {
  let a = intervals.axes;
  return a[i].zoomed && a[i].domain;
};

function densityFilter(filteredPaths, intervals) {
  /** See header comment : in the case of streaming, densityCount() is not applied.
   * @see filterPaths()
   */
  if ((filteredPaths.length > 1) && (intervals.page && intervals.page.thresholdFactor)) {
    /** number of samples to skip. */
    let count = densityCount(filteredPaths.length, intervals)
    // let filteredPaths = nthSample(paths, intervals.nSamples);
    if (count)
      filteredPaths = nthSample(filteredPaths, count);
  }
  if (filteredPaths.length > intervals.nFeatures) {
    if (trace_filter)
      console.log(filteredPaths.length, '> nFeatures', intervals.nFeatures);
    filteredPaths = filteredPaths.slice(intervals.nFeatures);
  }
  return filteredPaths;
}



/**
 * @param intervals expect that intervals.axes.length === 1.
 * axes[] doesn't need to be an array, but that offers potential for easier shared functionality with filterPaths()
 */
exports.filterFeatures = function(features, intervals) {
  // based on exports.filterPaths().

  // pathsViaStream() will call .filterFeatures() once for each feature
  if (trace_filter > (2 - (features.length > 1))) {
    // console.log('features, intervals => ', features, intervals);
    console.log('features.length => ', features.length);
  }
  let filteredFeatures;
  if (intervals.axes[0].domain)
    filteredFeatures = domainFilterFeatures(features, intervals);
  else
    filteredFeatures = features;

  if ((filteredFeatures.length > 1) && (intervals.page && intervals.page.thresholdFactor)) {
    /** number of samples to skip. */
    let count = densityCount(filteredFeatures.length, intervals);
    if (count)
      filteredFeatures = nthSample(filteredFeatures, count);
  }
  return filteredFeatures;
};



function nthSample(paths, count) {
  let nth = Math.ceil(count)
  return paths.filter((path, i) => {
    return (i % nth === 0)
  })
}

function densityCount(numPaths, intervals) {
  // console.log('numPaths, intervals => ', numPaths, intervals);
  // console.log('intervals.axes[0].range => ', intervals.axes[0].range);
  // console.log('intervals.axes[1].range => ', intervals.axes[1].range);
  // console.log('intervals.axes => ', intervals.axes);
  let pixelspacing = 5;

  // using total in block instead of # features in domain interval.
  function blockCount(total, rangeLength) {
    // console.log('total, range => ', total, rangeLength);
    // console.log('range / pixelspacing => ', rangeLength / pixelspacing);
    return total * pixelspacing / rangeLength;
  }
  // What should range (pixel space) look like?
  // Is it a range of values? (Start and end point of pixel space,
  // a single length value may be all that's needed)
  // Is it different for different axes?
  // How does different ranges affect the samples?

  let count
  let counts = intervals.axes.map(a => {
    // console.log('intervals.axes[i] => ', intervals.axes[i]);
    var range = a.range
    var rangeLength = Array.isArray(range) ? (range[1] - range[0]) : range
    return blockCount(numPaths, rangeLength);
  });
  count = Math.sqrt(counts[0] * counts[1]);
  count = count / intervals.page.thresholdFactor;
  count = Math.round(count);
  if (trace_filter > (2 - (numPaths > 1)))
    console.log('Calculated density count => ', count, counts, numPaths);
  return count
}

function domainFilter(paths, intervals) {
  const LEFT = 0, RIGHT = 1
  const BLOCK0 = 0, BLOCK1 = 1

  // paths = paths.slice(0, 3)

  /* Checking paths object structure */
  if (trace_filter > 2) {
    console.dir(paths[0], { depth: null });
    console.dir(paths[1], { depth: null });
  // console.log('paths[0].alignment[0] => ', paths[0].alignment[0]);
  // console.log('paths[0].alignment[0].blockId => ', paths[0].alignment[0].blockId);
  // console.log('paths[0].alignment[1].blockId => ', paths[0].alignment[1].blockId);

  // console.log('paths[1].alignment[0].blockId => ', paths[1].alignment[0].blockId);
  // console.log('paths[1].alignment[1].blockId => ', paths[1].alignment[1].blockId);
  // console.log('paths[0].alignment[0].repeats.features => ', paths[0].alignment[0].repeats.features);
  // console.log('paths[0].alignment[0].repeats.features[0].range => ', paths[0].alignment[0].repeats.features[0].range);
  // console.log('paths[0].alignment[1].repeats.features[0].range => ', paths[0].alignment[1].repeats.features[0].range);
  }
  
  let domains = [BLOCK0, BLOCK1].map(block => {
    /** ignore given domain if ! .zoomed; @see filterDomain() */
    let a = intervals.axes[block];
    return a.zoomed && a.domain;
  })
  if (trace_filter > 2) {
    console.dir(domains, { depth: null });
  // console.log('domains => ', domains);
   console.log('paths.length => ', paths.length);
  }
  let result = paths.map((original, pathIndex) => {
    let path = _.cloneDeep(original)
    path.alignment = path.alignment.map((block, i) => {
      if (!domains[i]) {
        return block
      }
      // let features = block.repeats.features

      if ((trace_filter > 2) && (pathIndex < 3))
        console.log('unfiltered features .length => ', block.repeats.features.length);
      block.repeats.features = block.repeats.features.filter(f => {
        let range = f.value || f.range
        if (range.length === 1)
          range[1] = range[0];
        let ok = ((range[LEFT] >= domains[i][LEFT]) &&
                  range[RIGHT] <= domains[i][RIGHT]);
        if ((trace_filter > 2) && (pathIndex < 3)) {
          console.log(f, ok);
          console.dir(range, { depth: null });
          console.dir(domains[i], { depth: null });
        }
        return ok;
      })
      if ((trace_filter > 2) && (pathIndex < 3))
        console.log('filtered features .length => ', block.repeats.features.length);
      return block
    })

    if ((trace_filter > 2) && (pathIndex < 3)) {
     console.log('path.alignment => ', path.alignment);
     console.log('path 0 => ', path.alignment[0].repeats.features);
     console.log('path 1 => ', path.alignment[1].repeats.features);
     console.log('original 0 => ', original.alignment[0].repeats.features);
     console.log('original 1 => ', original.alignment[1].repeats.features);

     let equal0 = path.alignment[0].repeats.features.length === original.alignment[0].repeats.features.length
     let equal1 = path.alignment[1].repeats.features.length === original.alignment[1].repeats.features.length

      console.log('equal0, equal1 => ', equal0, equal1);
    }
    return path
  })
  
  return result.filter(path => {
    let keepArray = [BLOCK0, BLOCK1].map(block => {
      return path.alignment[block].repeats.features.length > 0
    })
    return keepArray[BLOCK0] && keepArray[BLOCK1]
  })
}

/** Determine if the point v is in the interval domain.
 * The result is analogous to the comparator function (cmp) result.
 * Assume i[0] < i[1].
 * @return 0 if v is in i, -1 if v < i, +1 if v > i
 */
function inInterval(i, v) {
  let
    in0 = i[0] <= v,
  in1 = v <= i[1],
  within = in0  &&  in1,
  cmp = within ? 0 : (in0 ? 1 : -1);
  return cmp;
}

function trueFunction() { return true; }

/**
 * @return a function which takes a feature as parameter and returns true if
 * the feature value is within the domain.
 * @param dataLocation  function which reads the location value from the data
 * @param domain  Array[2] of location limit values.  Not undefined.
 */
function inDomain(dataLocation, domain) {
  function featureInDomain(f) {
    let v = dataLocation(f),
    /** handle value array with 1 or 2 elements */
    inA =
      v.map(function (vi) { return inInterval(domain, vi); });
    let result;
    if (v.length === 1) {
      let
        in0 = (inA[0] === 0);
      result = in0;
    }
    else {
      let
        in0 = (inA[0] === 0),
        in1 = (inA[1] === 0),
      within = in0  &&  in1,
      /** i.e. feature value overlaps or contains domain as a subset. */
      overlapping = inA[0] != inA[1];
      result = within || overlapping;
    }
    // console.log('featureInDomain', f, v, inA, result);
    return result;
  };
  return featureInDomain;
}

/** Filter features by the domain defined in intervals.axes[0].
 * Uses @see inDomain().
 * @param data  paths from aliases
 */
function domainFilterPathAliases(data, intervals) {
  if (trace_filter > (1 - (data.length > 1)))
    console.log('domainFilterPathAliases', data.length, intervals, intervals.axes[0].domain);
  if (trace_filter > (2 - (data.length > 1)))
    logArrayEnds('', data, 1);
  const featureFields = ["featureAObj", "featureBObj"];
  let debugCount = 1;
  function debugCounter() { if (debugCount > 0) { debugCount--; debugger; }; };
  function dataLocation(i) { return function (d) { /*debugCounter();*/ let f = d[featureFields[i]]; return f.value || f.range; }; };
  function check1(i) {
    let a = intervals.axes[i];
    return (a.zoomed && a.domain) ? inDomain(dataLocation(i), a.domain) : trueFunction;
 };
  let check1_0 = check1(0),
  check1_1 = check1(1);
  function check(p) { return check1_0(p) && check1_1(p); };
  let
  filtered = data.filter(check);
  if (trace_filter > (2 - (data.length > 1)))
    logArrayEnds('filtered', filtered, 1);
  return filtered;
}

/** Filter features by the domain defined in intervals.axes[0].
 * Uses @see inDomain().
 */
function domainFilterFeatures(features, intervals) {
  console.log('domainFilterFeatures', features.length, intervals, intervals.axes[0].domain);
  if (trace_filter > (2 - (features.length > 1))) 
    logArrayEnds('', features, 1);
  /** handle older data;  Feature.range is now named .value  */
  function dataLocation(f) { return f.value || f.range; };
  let check = inDomain(dataLocation, intervals.axes[0].domain),
  filtered = features.filter(check);
  if (trace_filter > (2 - (features.length > 1))) 
    logArrayEnds('filtered', filtered, 1);
  return filtered;
}

/** Log the first and last elements of an array.
 * Used to check filtering by interval.
 */
function logArrayEnds(label, a, margin) {
  console.log(label, a.length, a.slice(0, margin));
  if (a.length > 1)
    console.log('...', a.length-2*margin, a.slice(-margin));
}
