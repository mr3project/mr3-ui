
import Ember from 'ember';

/**
 * The data processing part of Dag View.
 *
 * Converts raw DAG-plan into an internal data representation as shown below.
 * Data processor exposes just a functions and an enum to the outside world, everything else
 * happens inside the main closure:
 *   - types (Enum of node types)
 *   - graphifyData
 *
 * Links, Edges:
 * --------------
 * d3 layout & graph-view uses the term links, and dag-plan uses edges. Hence you would
 * see both getting used in this file.
 *
 * Graphify Data
 * -------------
 *  graphifyData function is a translator that translates the dagPlan object send by timeline server
 * into another object that graph-view and in turn d3.layout.tree can digest.
 *
 * Input object(dag-plan as it is from the timeline server):
 *  {
 *    dagName, version,
 *    vertices: [ // Array of vertex objects with following properties
 *      {
 *        vertexName, processorClass, outEdgeIds {Array}, additionalInputs {Array}
 *      }
 *    ],
 *    edges: [ // Array of edge objects with following properties
 *      {
 *        edgeId, inputVertexName, outputVertexName, dataMovementType, dataSourceType
 *        schedulingType, edgeSourceClass, edgeDestinationClass
 *      }
 *    ],
 *    vertexGroups: [ // Array of vectorGroups objects with following properties
 *      {
 *        groupName, groupMembers {Array}, edgeMergedInputs {Array}
 *      }
 *    ]
 *  }
 *
 * Output object:
 *  We are having a graph that must be displayed like a tree. Hence data processor was created
 *  to make a tree structure out of the available data. The tree structure is made by creating
 *  DataNodes instances and populating their children array with respective child DataNodes
 *   - tree: Represents the tree structure with each node being a DataNodes instance
 *   - links: Represents the connections between the nodes to create the graph
 *    {
 *      tree: { // This object points to the RootDataNode instance
 *        children {Array} // Array of DataNodes under the node, as expected by d3.layout.tree
 *        + Other custom properties including data that needs to be displayed
 *      }
 *      links: [ // An array of all links in the tree
 *        {
 *          sourceId // Source vertex name
 *          targetId // Target vertex name
 *          + Other custom properties including data to be displayed
 *        }
 *      ]
 *      maxDepth, leafCount
 *    }
 *
 * Data Nodes:
 * -----------
 *  To make the implementation simpler each node in the graph will be represented as an
 *  instance of any of the 4 inherited classes of Data Node abstract class.
 *  DataNode
 *    |-- RootDataNode
 *    |-- VertexDataNode
 *    |-- InputDataNode
 *    +-- OutputDataNode
 *
 * Extra Nodes:
 * ------------
 * Root Node (Invisible):
 *  Dag view support very complex DAGs, even those without interconnections and backward links.
 *  Hence to fit it into a tree layout I have inserted an invisible root node.
 *
 * Dummy Node (Invisible):
 *  Sinks of a vertex are added at the same level of its parent node, Hence to ensure that all
 *  nodes come under the root, a dummy node was added as the child of the root. The visible tree
 *  would be added as child of dummy node.
 *  Dummy also ensures the view symmetry when multiple outputs are present at the dummy level.
 *
 * Sample Structure, inverted tree representation:
 *
 *            As in the view
 *
 *               Source_m1
 *                  |
 *   Source_m2      M1----------+
 *      |           |           |
 *      +-----------M2      Sink_M1
 *                  |
 *      +-----------R1----------+
 *      |                       |
 *   Sink1_R1               Sink2_R1
 *
 *
 *        Internal representation
 *
 *               Source_m1
 *                  |
 *   Source_m2      M1
 *      |           |
 *      +-----------M2      Sink_M1
 *                  |           |
 *                  R1----------+
 *                  |
 *   Sink1_R1     Dummy     Sink2_R1
 *      |           |           |
 *      +-----------+-----------+
 *                  |
 *                 Root
 *
 *     Internal data representation
 *
 *     Root
 *      |
 *      +-- children[Sink1_R1, Dummy, Sink2_R1]
 *                              |
 *                              +-- children[R1]
 *                                            |
 *                                            +-- children[M2, Sink_M1]
 *                                                          |
 *                                                          +-- children[Source_m2, M1]
 *                                                                                   |
 *                                                                                   +-- children[Source_m1]
 *
 * Steps:
 * ------
 * The job is done in 4 steps, and is modularized using 4 separate recursive functions.
 * 1. _treefyData      : Get the tree structure in place with vertices and inputs/sources
 * 2. _addOutputs      : Add outputs/sinks. A separate step had to be created as outputs
 *                       are represented in the opposite direction of inputs.
 * 3. _cacheChildren   : Make a cache of children in allChildren property for later use
 * 4. _getGraphDetails : Get a graph object with all the required details
 *
 */

/**
 * Enum of various node types
 */
var types = {
  ROOT: 'root',
  DUMMY: 'dummy',
  VERTEX: 'vertex',
  DAEMON_VERTEX: 'daemonVertex',
  INPUT: 'input',
  OUTPUT: 'output'
};

/**
 * Iterates the array in a symmetric order, from middle to outwards
 * @param array {Array} Array to be iterated
 * @param callback {Function} Function to be called for each item
 * @return A new array created with value returned by callback
 */
function centericMap(array, callback) {
  var retArray = [],
      length,
      left, right;

  if(array) {
    length = array.length - 1;
    left = length >> 1;

    while(left >= 0) {
      retArray[left] = callback(array[left]);
      right = length - left;
      if(right !== left) {
        retArray[right] = callback(array[right]);
      }
      left--;
    }
  }
  return retArray;
}

/**
 * Abstract class for all types of data nodes
 */
var DataNode = Ember.Object.extend({
      init: function (data) {
        this._super(data);
        this._init(data);
      },
      _init: function () {
        // Initialize data members
        this.setProperties({
          /**
           * Children that would be displayed in the view, to hide a child it would be removed from this array.
           * Not making this a computed property because - No d3 support, low performance.
           */
          children: null,
          allChildren: null, // All children under this node
          treeParent: null,  // Direct parent DataNode in our tree structure
        });
      },

      /**
       * Private function.
       * Set the child array as it is. Created because of performance reasons.
       * @param children {Array} Array to be set
       */
      _setChildren: function (children) {
        this.set('children', children && children.length > 0 ? children : null);
      },
      /**
       * Public function.
       * Set the child array after filtering
       * @param children {Array} Array of DataNodes to be set
       */
      setChildren: function (children) {
        var allChildren = this.get('allChildren');
        if(allChildren) {
          this._setChildren(allChildren.filter(function (child) {
            return children.indexOf(child) !== -1; // true if child is in children
          }));
        }
      },
      /**
       * Filter out the given children from the children array.
       * @param childrenToRemove {Array} Array of DataNodes to be removed
       */
      removeChildren: function (childrenToRemove) {
        var children = this.get('children');
        if(children) {
          children = children.filter(function (child) {
            return childrenToRemove.indexOf(child) === -1; // false if child is in children
          });
          this._setChildren(children);
        }
      },

      /**
       * Return true if this DataNode is same as or the ancestor of vertex
       * @param vertex {DataNode}
       */
      isSelfOrAncestor: function (vertex) {
        while(vertex) {
          if(vertex === this){
            return true;
          }
          vertex = vertex.treeParent;
        }
        return false;
      },

      /**
       * If the property is available, expects it to be an array and iterate over
       * its elements using the callback.
       * @param vertex {DataNode}
       * @param callback {Function}
       * @param thisArg {} Will be value of this inside the callback
       */
      ifForEach: function (property, callback, thisArg) {
        if(this.get(property)) {
          this.get(property).forEach(callback, thisArg);
        }
      },
      /**
       * Recursively call the function specified in all children
       * its elements using the callback.
       * @param functionName {String} Name of the function to be called
       */
      recursivelyCall: function (functionName) {
        if(this[functionName]) {
          this[functionName]();
        }
        this.ifForEach('children', function (child) {
          child.recursivelyCall(functionName);
        });
      }
    }),
    RootDataNode = DataNode.extend({
      type: types.ROOT,
      vertexName: 'root',
      dummyVertex: null, // Dummy node used in the tree, check top comments for explanation
      dummyDaemonVertex: null,
      depth: 0,    // Depth of the node in the tree structure

      _init: function () {
        this._setChildren([this.get('dummyVertex'), this.get('dummyDaemonVertex')]);
      }
    }),
    VertexDataNode = DataNode.extend({
      type: types.VERTEX,

      _additionalsIncluded: true,

      _init: function () {
        this._super();

        // Initialize data members
        this.setProperties({
          id: this.get('vertexName'),
          inputs: [], // Array of sources
          outputs: [] // Array of sinks
        });

        this.ifForEach('additionalInputs', function (input) {
          this.inputs.push(InputDataNode.instantiate(this, input));
        }, this);

        this.ifForEach('additionalOutputs', function (output) {
          this.outputs.push(OutputDataNode.instantiate(this, output));
        }, this);
      },

      /**
       * Sets depth of the vertex and all its input children
       * @param depth {Number}
       */
      setDepth: function (depth) {
        this.set('depth', depth);

        depth++;
        this.get('inputs').forEach(function (input) {
          input.set('depth', depth);
        });
      },

      /**
       * Sets vertex tree parents
       * @param parent {DataNode}
       */
      setParent: function (parent) {
        this.set('treeParent', parent);
      },

      /**
       * Include sources and sinks in the children list, so that they are displayed
       */
      includeAdditionals: function() {
        this.setChildren(this.get('inputs').concat(this.get('children') || []));

        var ancestor = this.get('parent.parent');
        if(ancestor) {
          ancestor.setChildren(this.get('outputs').concat(ancestor.get('children') || []));
        }
        this.set('_additionalsIncluded', true);
      },
      /**
       * Exclude sources and sinks in the children list, so that they are hidden
       */
      excludeAdditionals: function() {
        this.removeChildren(this.get('inputs'));

        var ancestor = this.get('parent.parent');
        if(ancestor) {
          ancestor.removeChildren(this.get('outputs'));
        }
        this.set('_additionalsIncluded', false);
      },
      /**
       * Toggle inclusion/display of sources and sinks.
       */
      toggleAdditionalInclusion: function () {
        var include = !this.get('_additionalsIncluded');
        this.set('_additionalsIncluded', include);

        if(include) {
          this.includeAdditionals();
        }
        else {
          this.excludeAdditionals();
        }
      }
    }),
    DaemonVertexDataNode = DataNode.extend({
      type: types.DAEMON_VERTEX,

      _init: function () {
        this._super();

        // Initialize data members
        this.setProperties({
          id: this.get('vertexName'),
        });
      },

      /**
       * Sets depth of the vertex and all its input children
       * @param depth {Number}
       */
      setDepth: function (depth) {
        this.set('depth', depth);

        depth++;
      },

      /**
       * Sets vertex tree parents
       * @param parent {DataNode}
       */
      setParent: function (parent) {
        this.set('treeParent', parent);
      }
    }),
    InputDataNode = Ember.$.extend(DataNode.extend({
      type: types.INPUT,
      vertex: null, // The vertex DataNode to which this node is linked

      _init: function () {
        var vertex = this.get('vertex');
        this._super();

        // Initialize data members
        this.setProperties({
          id: vertex.get('vertexName') + this.get('name'),
          depth: vertex.get('depth') + 1
        });
      }
    }), {
      /**
       * Initiate an InputDataNode
       * @param vertex {DataNode}
       * @param data {Object}
       */
      instantiate: function (vertex, data) {
        return InputDataNode.create(Ember.$.extend(data, {
          treeParent: vertex,
          vertex: vertex
        }));
      }
    }),
    OutputDataNode = Ember.$.extend(DataNode.extend({
      type: types.OUTPUT,
      vertex: null, // The vertex DataNode to which this node is linked

      _init: function (/*data*/) {
        this._super();

        // Initialize data members
        this.setProperties({
          id: this.get('vertex.vertexName') + this.get('name')
        });
      }
    }), {
      /**
       * Initiate an OutputDataNode
       * @param vertex {DataNode}
       * @param data {Object}
       */
      instantiate: function (vertex, data) {
        /**
         * We will have an idea about the treeParent & depth only after creating the
         * tree structure.
         */
        return OutputDataNode.create(Ember.$.extend(data, {
          vertex: vertex
        }));
      }
    });

var _data = null; // Raw dag plan data

/**
 * Step 1: Recursive
 * Creates primary skeletal structure with vertices and inputs as nodes,
 * All child vertices & inputs will be added to an array property named children
 * As we are trying to treefy graph data, nodes might reoccur. Reject if its in
 * the ancestral chain, and if the new depth is lower (Higher value) than the old
 * reposition the node.
 *
 * @param vertex {VertexDataNode} Root vertex of current sub tree
 * @param depth {Number} Depth of the passed vertex
 * @param vertex {VertexDataNode}
 */
function _treefyData(vertex, depth) {
  var children,
      parentChildren;

  depth++;

  children = centericMap(vertex.get('inEdgeIds'), function (edgeId) {
    var child = _data.vertices.get(_data.edges.get(edgeId).get('inputVertexName'));
    if(!child.isSelfOrAncestor(vertex)) {
      if(child.depth) {
        if(child.depth < depth) {
          parentChildren = child.get('treeParent.children');
          if(parentChildren) {
            parentChildren.removeObject(child);
          }
        }
        else {
          return;
        }
      }
      child.setParent(vertex);
      return _treefyData(child, depth);
    }
  });

  // Remove undefined entries
  children = children.filter(function (child) {
    return child;
  });

  vertex.setDepth(depth);

  // Adds a dummy child to intermediate inputs so that they
  // gets equal relevance as adjacent nodes on plotting the tree!
  if(children.length) {
    vertex.ifForEach('inputs', function (input) {
      input._setChildren([DataNode.create()]);
    });
  }

  children.push.apply(children, vertex.get('inputs'));

  vertex._setChildren(children);
  return vertex;
}

/**
 * Part of step 1
 * To remove recurring vertices in the tree
 * @param vertex {Object} root vertex
 */
function _normalizeVertexTree(vertex) {
  var children = vertex.get('children');

  if(children) {
    children = children.filter(function (child) {
      _normalizeVertexTree(child);
      return child.get('type') !== 'vertex' || child.get('treeParent') === vertex;
    });

    vertex._setChildren(children);
  }

  return vertex;
}

/**
 * Step 2: Recursive awesomeness
 * Attaches outputs into the primary structure created in step 1. As outputs must be represented
 * in the same level of the vertex's parent. They are added as children of its parent's parent.
 *
 * The algorithm is designed to get a symmetric display of output nodes.
 * A call to the function will iterate through all its children, and inserts output nodes at the
 * position that best fits the expected symmetry.
 *
 * @param vertex {VertexDataNode}
 * @return {Object} Nodes that would come to the left and right of the vertex.
 */
function _addOutputs(vertex) {
  var childVertices = vertex.get('children'),
      childrenWithOutputs = [],

      midIndex,

      left = [],
      right = [];

  // For a symmetric display of output nodes
  if(childVertices && childVertices.length) {
    midIndex = Math.floor(childVertices.length / 2);
    if(childVertices.length % 2 === 0) {
      midIndex--;
    }

    childVertices.forEach(function (child, index) {
      var additionals = _addOutputs(child),
          outputs,
          mid;

      childrenWithOutputs.push.apply(childrenWithOutputs, additionals.left);
      childrenWithOutputs.push(child);
      childrenWithOutputs.push.apply(childrenWithOutputs, additionals.right);

      outputs = child.get('outputs');
      if(outputs && outputs.length) {
        mid = outputs.length / 2;

        outputs.forEach(function (output) {
          output.depth = vertex.depth;
        });

        if(index < midIndex) {
          left.push.apply(left, outputs);
        }
        else if(index > midIndex) {
          right.push.apply(right, outputs);
        }
        else {
          left.push.apply(left, outputs.slice(mid));
          right.push.apply(right, outputs.slice(0, mid));
        }
      }
    });

    vertex._setChildren(childrenWithOutputs);
  }

  return {
    left: left,
    right: right
  };
}

/**
 * Step 3: Recursive
 * Create a copy of all possible children in allChildren for later use
 * @param node {DataNode}
 */
function _cacheChildren(node) {
  var children = node.get('children');
  if(children) {
    node.set('allChildren', children);
    children.forEach(_cacheChildren);
  }
}

/**
 * Return an array of the incoming edges/links and input-output source-sink edges of the node.
 * @param node {DataNode}
 * @return links {Array} Array of all incoming and input-output edges of the node
 */
function _getLinks(node) {
  var links = [];

  node.ifForEach('inEdgeIds', function (inEdge) {
    var edge = _data.edges.get(inEdge);
    edge.setProperties({
      sourceId: edge.get('inputVertexName'),
      targetId: edge.get('outputVertexName')
    });
    links.push(edge);
  });

  if(node.type === types.INPUT) {
    links.push(Ember.Object.create({
      sourceId: node.get('id'),
      targetId: node.get('vertex.id')
    }));
  }
  else if(node.type === types.OUTPUT) {
    links.push(Ember.Object.create({
      sourceId: node.get('vertex.id'),
      targetId: node.get('id')
    }));
  }

  return links;
}

/**
 * Step 4: Recursive
 * Create a graph based on the given tree structure and edges in _data object.
 * @param tree {DataNode}
 * @param details {Object} Object with values tree, links, maxDepth & maxHeight
 */
function _getGraphDetails(tree) {
  var maxDepth = 0,
      leafCount = 0,

      links = _getLinks(tree);

  tree.ifForEach('children', function (child) {
    var details = _getGraphDetails(child);
    maxDepth = Math.max(maxDepth, details.maxDepth);
    leafCount += details.leafCount;

    links.push.apply(links, details.links);
  });

  if(!tree.get('children')) {
    leafCount++;
  }

  return {
    tree: tree,
    links: links,
    maxDepth: maxDepth + 1,
    leafCount: leafCount
  };
}

/**
 * Converts vertices & edges into hashes for easy access.
 * Makes vertexGroup a property of the respective vertices.
 * @param data {Object}
 * @return {Object} An object with vertices hash, edges hash and array of root vertices.
 */
function _normalizeRawData(data) {
  var EmObj = Ember.Object,
      vertices,          // Hash of vertices
      edges,             // Hash of edges
      daemonVertices,    // Hash of daemon vertices
      rootVertices = [], // Vertices without out-edges are considered root vertices
      daemonVerticesList = [];

  vertices = data.vertices.reduce(function (obj, vertex) {
    vertex = VertexDataNode.create(vertex);
    if(!vertex.outEdgeIds) {
      rootVertices.push(vertex);
    }
    obj[vertex.vertexName] = vertex;
    return obj;
  }, {});

  edges = !data.edges ? [] : data.edges.reduce(function (obj, edge) {
    obj[edge.edgeId] = EmObj.create(edge);
    return obj;
  }, {});

  daemonVertices = data.daemonVertices.reduce(function (obj, daemonVertex) {
    daemonVertex = DaemonVertexDataNode.create(daemonVertex);
    obj[daemonVertex.vertexName] = daemonVertex;
    daemonVerticesList.push(daemonVertex);
    return obj;
  }, {});

  if(data.vertexGroups) {
    data.vertexGroups.forEach(function (group) {
      group.groupMembers.forEach(function (vertex) {
        vertices[vertex].vertexGroup = EmObj.create(group);
      });
    });
  }

  return {
    vertices: EmObj.create(vertices),
    edges: EmObj.create(edges),
    daemonVertices,
    rootVertices: rootVertices,
    daemonVerticesList
  };
}

var DataProcessor = {
  // Types enum
  types: types,

  /**
   * Converts raw DAG-plan into an internal data representation that graph-view,
   * and in turn d3.layout.tree can digest.
   * @param data {Object} Dag-plan data
   * @return {Object/String}
   *    - Object with values tree, links, maxDepth & maxHeight
   *    - Error message if the data was not as expected.
   */
  graphifyData: function (data) {
    var dummyVertex = DataNode.create({
          type: types.DUMMY,
          vertexName: 'dummyVertex',
          depth: 1
        }),
        dummyDaemonVertex = DataNode.create({
          type: types.DUMMY,
          vertexName: 'dummyDaemonVertex',
          depth: 1
        }),
        root = RootDataNode.create({
          dummyVertex: dummyVertex,
          dummyDaemonVertex: dummyDaemonVertex
        });

    if(!data.vertices) {
      return "Vertices not found!";
    }

    _data = _normalizeRawData(data);

    if(!_data.rootVertices.length) {
      return "Sink vertex not found!";
    }

    dummyVertex._setChildren(centericMap(_data.rootVertices, function (vertex) {
      return _normalizeVertexTree(_treefyData(vertex, 2));
    }));
    dummyDaemonVertex._setChildren(centericMap(_data.daemonVerticesList, function (daemonVertex) {
      return _normalizeVertexTree(_treefyData(daemonVertex, 2));
    }))

    _addOutputs(root);

    _cacheChildren(root);

    return _getGraphDetails(root);
  }
};

// TODO - Convert to pure ES6 style export without using an object
export default DataProcessor;
