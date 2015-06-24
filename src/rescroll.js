'use strict';

var Utils = {
  viewPortWidthHeight: function getViewport() {
    var viewPortWidth;
    var viewPortHeight;
    // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
    if (typeof window.innerWidth !== 'undefined') {
      viewPortWidth = window.innerWidth,
      viewPortHeight = window.innerHeight
    }
    // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
    else if (typeof document.documentElement !== 'undefined' &&
      typeof document.documentElement.clientWidth !== 'undefined' &&
      document.documentElement.clientWidth !== 0) {
      viewPortWidth = document.documentElement.clientWidth;
      viewPortHeight = document.documentElement.clientHeight;
    }
    // older versions of IE
    else {
      viewPortWidth = document.getElementsByTagName('body')[0].clientWidth;
      viewPortHeight = document.getElementsByTagName('body')[0].clientHeight;
    }
    return {w: viewPortWidth, h: viewPortHeight};
  },
  documentScrollTarget: function () {
    document.body.scrollTop += 1;
    if (document.body.scrollTop === 0) {
      return 'documentElement';
    }
    else {
      document.body.scrollTop -= 1;
      return 'body';
    }
  }
};

var Processor = {
  focus: function(anchors, center) {
    // update focus by:
    //   1. if no anchors: searching through children elements of element at center
    //   2. if has anchors: searching through anchor list
    if (!anchors || !anchors.length) {
      // default search, no anchor
      // get center element, either image or text
      // find sub boxes
      var centerElement = document.elementFromPoint(center.x, center.y);
      // switch focused node finder based on element types:
      //   1. text: use bounding rect of each descendant text node
      //   2. box: use bounding rect of itself
      // find focus based on center type

      // TODO: separate normal box & text box,
      //  if no text's total height is not enough -> use Box
      if (centerElement.tagName === 'IMAGE')
        return Processor.Box.focus(centerElement, center);
      else
        return Processor.Text.focus(centerElement, center);
    } else if (Object.prototype.toString.call(anchors) === '[object Array]' && anchors.length){
      // search through anchor list
      // find smallest element inside anchors array
      // that contains center coordinate
      // then find focus based on best element

      var best = {
        anchor: null,
        value: window.innerHeight
      };
      var wrapped = false;
      for (var i = 0; i < anchors.length; i++) {
        var rect = this.Box.getBoundingRect(anchors[i].element);
        if ((rect.y1 <= center.y) && (rect.y2 >= center.y)) {
          if (!wrapped) {
            best = {
              anchor: anchors[i],
              value: rect.y2 - rect.y1
            };
            wrapped = true;
          }
          else {
            if (rect.y2 - rect.y1 < best.value)
              best = {
                anchor: anchors[i],
                value: rect.y2 - rect.y1
              };
          }
        }
        else if (!wrapped) {
          if (rect.y1 > center.y && rect.y1 - center.y < best.value)
            best = {
              anchor: anchors[i],
              value: rect.y1 - center.y
            };
          else if (center.y > rect.y2 && center.y - rect.y2 < best.value)
            best = {
              anchor: anchors[i],
              value: center.y - rect.y2
            };
        }
      }
      return this[best.anchor.type].focus(best.anchor.element, center);
    } else {
      throw 'Rescroll Error - Anchors invalid';
    }
  },
  getNewSize: function(focus) {
    if (focus.type === 'Text')
      return this.Text.getBoundingRect(focus.node);
    else if (focus.type === 'Box')
      return this.Box.getBoundingRect(focus.element);
  },
  Text: {
    getTextNodesIn: function(node) {
      var textNodes = [];
      if (node.nodeType == 3) {
        textNodes.push(node);
      } else {
        var children = node.childNodes;
        for (var i = 0, len = children.length; i < len; ++i) {
          textNodes.push.apply(textNodes, this.getTextNodesIn(children[i]));
        }
      }
      return textNodes;
    },
    getBoundingRect: function(node) {
      var range = document.createRange();
      range.selectNodeContents(node);
      var rects = range.getClientRects();
      if (!rects[0])
        return false;
      return {
        y1: rects[0].top,
        y2: rects[rects.length - 1].bottom
      }
    },
    focus: function(element, center) {
      if (document.createRange && window.getSelection) {
        var range = document.createRange();
        range.selectNodeContents(element);
        var textNodes = this.getTextNodesIn(element);
        // find closest visible child textNode
        var best = {
          node: null,
          boundingRect: null,
          pos: null,
          d: window.innerHeight
        };
        var y1, y2, node, boundingRect;
        for (var i = 0; i < textNodes.length; i++) {
          node = textNodes[i];
          boundingRect = this.getBoundingRect(node);
          if (!boundingRect) continue;
          y1 = boundingRect.y1;
          y2 = boundingRect.y2;
          if ((y1 <= center.y) && (y2 >= center.y)) {
            best.node = node;
            best.boundingRect = boundingRect;
            best.pos = 0;
            break;
          }
          else if ((y2 <= center.y) && (center.y - y2 < best.d)) {
            best.node = node;
            best.boundingRect = boundingRect;
            best.d = Math.abs(center.y - y2);
            best.pos = -1;
          }
          else if ((y1 >= center.y) && (y1 - center.y < best.d)) {
            best.node = node;
            best.boundingRect = boundingRect;
            best.d = Math.abs(center.y - y1);
            best.pos = 1;
          }
        }
        return {
          node: best.node,
          type: 'Text',
          boundingRect: best.boundingRect,
          distanceToCenter: center.y - y1
        };
      }
    }
  },
  Box: {
    getBoundingRect: function(element) {
      var rect = element.getBoundingClientRect();
      return {
        y1: rect.top,
        y2: rect.bottom
      }
    },
    focus: function(element, center) {
      var boundingRect = this.getBoundingRect(element);
      return {
        element: element,
        type: 'Box',
        boundingRect: boundingRect,
        distanceToCenter: center.y - boundingRect.y1
      }
    }
  }
};

function InitRescroll(options) {
  var defaultOptions = {
    scrollTarget: document[Utils.documentScrollTarget()],
    resizeTarget: window,
    anchors: null,
    center: {
      rX: 0.5,
      rY: 0.5
    }
  };
  options = options || {};
  var scrollTarget = options.scrollTarget || defaultOptions.scrollTarget;
  var resizeTarget = options.resizeTarget || defaultOptions.resizeTarget;

  // each anchor object in the anchor array
  // will have the following format
  // {
  //   element: dom object
  //   type: text/image/video/flash/other
  // }
  var anchors = options.anchors || defaultOptions.anchors;

  // for configuration of desired center:
  //    50/50, 2/3, 1/3...
  var centerNormalized = {
    rX: options.focusCenterX || defaultOptions.center.rX,
    rY: options.focusCenterY || defaultOptions.center.rY
  };
  var center = {
    x: null,
    y: null
  };

  // exposed api
  var api = {};
  // prevent scroll handler from handling scroll event created
  // by rescroll in resize handler
  var allowUpdate = true;
  var focus = null;

  // activate & deactivate
  var active = true;

  // private methods
  function updateFocus() {
    var vp = Utils.viewPortWidthHeight();
    center = {
      x: centerNormalized.rX * vp.w,
      y: centerNormalized.rY * vp.h
    };
    focus = Processor.focus(anchors, center);
  }

  function rescroll() {
    var vp = Utils.viewPortWidthHeight();
    center = {
      x: centerNormalized.rX * vp.w,
      y: centerNormalized.rY * vp.h
    };
    var newBoundingRect = Processor.getNewSize(focus);
    var newHeightRatio = (newBoundingRect.y2 - newBoundingRect.y1) / (focus.boundingRect.y2 - focus.boundingRect.y1);
    var expectedCenter = {
      y: newHeightRatio * focus.distanceToCenter + newBoundingRect.y1
    };
    var delta = expectedCenter.y - center.y;
    scrollTarget.scrollTop += delta;
    if (Math.abs(delta) >= 0.5)
      allowUpdate = false;
  }

  function getAnchor() {}
  function setAnchor() {}
  function addAnchor() {}
  function removeAnchor() {}
  function bindAnchor() {}
  function allowUpdate() {}

  function activate() {
    active = true;
    updateFocus();
  }

  function deactivate() {
    active = false;
  }

  function init() {
    options = options || {};
    window.addEventListener('resize', function() {
      if (!active) return;
      if (focus) rescroll();
    });
    window.addEventListener('scroll', function() {
      if (!active) return;
      if (!allowUpdate) {
        allowUpdate = true;
        return;
      } else {
        updateFocus();
      }
    });
    updateFocus();
  }

  init();
  // public methods
  api.rescroll = rescroll;
  api.updateFocus = updateFocus;
  api.activate = activate;
  api.deactivate = deactivate;
  // api.getAnchor = getAnchor;
  // api.setAnchor = setAnchor;
  // api.addAnchor = addAnchor;
  // api.removeAnchor = removeAnchor;
  // api.bindAnchor = bindAnchor;
  return api;
};

module.exports = InitRescroll;
