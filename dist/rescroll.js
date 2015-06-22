(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.InitRescroll = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
      throw 'Reflow Error - Anchors invalid';
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
    scrollTarget: document.body,
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

  // private methods
  function updateFocus() {
    var vp = Utils.viewPortWidthHeight();
    center = {
      x: centerNormalized.rX * vp.w,
      y: centerNormalized.rY * vp.h
    };
    focus = Processor.focus(anchors, center);
    // console.log('focus', focus);
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
    // console.log('delta', delta, '-> allowUpdate', allowUpdate);
  }

  function getAnchor() {}
  function setAnchor() {}
  function addAnchor() {}
  function removeAnchor() {}
  function bindAnchor() {}
  function allowUpdate() {}

  function init() {
    //set up rescroller instance
    //  2. bind anchors
    //  3. bind onscroll & onresize
    options = options || {};
    window.addEventListener('resize', function() {
      if (focus)
        rescroll();
    });
    window.addEventListener('scroll', function() {
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
  api.getAnchor = getAnchor;
  api.setAnchor = setAnchor;
  api.addAnchor = addAnchor;
  api.removeAnchor = removeAnchor;
  api.bindAnchor = bindAnchor;
  return api;
};

module.exports = InitRescroll;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvcmVzY3JvbGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVXRpbHMgPSB7XG4gIHZpZXdQb3J0V2lkdGhIZWlnaHQ6IGZ1bmN0aW9uIGdldFZpZXdwb3J0KCkge1xuICAgIHZhciB2aWV3UG9ydFdpZHRoO1xuICAgIHZhciB2aWV3UG9ydEhlaWdodDtcbiAgICAvLyB0aGUgbW9yZSBzdGFuZGFyZHMgY29tcGxpYW50IGJyb3dzZXJzIChtb3ppbGxhL25ldHNjYXBlL29wZXJhL0lFNykgdXNlIHdpbmRvdy5pbm5lcldpZHRoIGFuZCB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICBpZiAodHlwZW9mIHdpbmRvdy5pbm5lcldpZHRoICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdmlld1BvcnRXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgdmlld1BvcnRIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICB9XG4gICAgLy8gSUU2IGluIHN0YW5kYXJkcyBjb21wbGlhbnQgbW9kZSAoaS5lLiB3aXRoIGEgdmFsaWQgZG9jdHlwZSBhcyB0aGUgZmlyc3QgbGluZSBpbiB0aGUgZG9jdW1lbnQpXG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggIT09ICd1bmRlZmluZWQnICYmXG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggIT09IDApIHtcbiAgICAgIHZpZXdQb3J0V2lkdGggPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGg7XG4gICAgICB2aWV3UG9ydEhlaWdodCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XG4gICAgfVxuICAgIC8vIG9sZGVyIHZlcnNpb25zIG9mIElFXG4gICAgZWxzZSB7XG4gICAgICB2aWV3UG9ydFdpZHRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXS5jbGllbnRXaWR0aDtcbiAgICAgIHZpZXdQb3J0SGVpZ2h0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXS5jbGllbnRIZWlnaHQ7XG4gICAgfVxuICAgIHJldHVybiB7dzogdmlld1BvcnRXaWR0aCwgaDogdmlld1BvcnRIZWlnaHR9O1xuICB9XG59O1xuXG52YXIgUHJvY2Vzc29yID0ge1xuICBmb2N1czogZnVuY3Rpb24oYW5jaG9ycywgY2VudGVyKSB7XG4gICAgLy8gdXBkYXRlIGZvY3VzIGJ5OlxuICAgIC8vICAgMS4gaWYgbm8gYW5jaG9yczogc2VhcmNoaW5nIHRocm91Z2ggY2hpbGRyZW4gZWxlbWVudHMgb2YgZWxlbWVudCBhdCBjZW50ZXJcbiAgICAvLyAgIDIuIGlmIGhhcyBhbmNob3JzOiBzZWFyY2hpbmcgdGhyb3VnaCBhbmNob3IgbGlzdFxuICAgIGlmICghYW5jaG9ycyB8fCAhYW5jaG9ycy5sZW5ndGgpIHtcbiAgICAgIC8vIGRlZmF1bHQgc2VhcmNoLCBubyBhbmNob3JcbiAgICAgIC8vIGdldCBjZW50ZXIgZWxlbWVudCwgZWl0aGVyIGltYWdlIG9yIHRleHRcbiAgICAgIC8vIGZpbmQgc3ViIGJveGVzXG4gICAgICB2YXIgY2VudGVyRWxlbWVudCA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoY2VudGVyLngsIGNlbnRlci55KTtcbiAgICAgIC8vIHN3aXRjaCBmb2N1c2VkIG5vZGUgZmluZGVyIGJhc2VkIG9uIGVsZW1lbnQgdHlwZXM6XG4gICAgICAvLyAgIDEuIHRleHQ6IHVzZSBib3VuZGluZyByZWN0IG9mIGVhY2ggZGVzY2VuZGFudCB0ZXh0IG5vZGVcbiAgICAgIC8vICAgMi4gYm94OiB1c2UgYm91bmRpbmcgcmVjdCBvZiBpdHNlbGZcbiAgICAgIC8vIGZpbmQgZm9jdXMgYmFzZWQgb24gY2VudGVyIHR5cGVcblxuICAgICAgLy8gVE9ETzogc2VwYXJhdGUgbm9ybWFsIGJveCAmIHRleHQgYm94LFxuICAgICAgLy8gIGlmIG5vIHRleHQncyB0b3RhbCBoZWlnaHQgaXMgbm90IGVub3VnaCAtPiB1c2UgQm94XG4gICAgICBpZiAoY2VudGVyRWxlbWVudC50YWdOYW1lID09PSAnSU1BR0UnKVxuICAgICAgICByZXR1cm4gUHJvY2Vzc29yLkJveC5mb2N1cyhjZW50ZXJFbGVtZW50LCBjZW50ZXIpO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gUHJvY2Vzc29yLlRleHQuZm9jdXMoY2VudGVyRWxlbWVudCwgY2VudGVyKTtcbiAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhbmNob3JzKSA9PT0gJ1tvYmplY3QgQXJyYXldJyAmJiBhbmNob3JzLmxlbmd0aCl7XG4gICAgICAvLyBzZWFyY2ggdGhyb3VnaCBhbmNob3IgbGlzdFxuICAgICAgLy8gZmluZCBzbWFsbGVzdCBlbGVtZW50IGluc2lkZSBhbmNob3JzIGFycmF5XG4gICAgICAvLyB0aGF0IGNvbnRhaW5zIGNlbnRlciBjb29yZGluYXRlXG4gICAgICAvLyB0aGVuIGZpbmQgZm9jdXMgYmFzZWQgb24gYmVzdCBlbGVtZW50XG5cbiAgICAgIHZhciBiZXN0ID0ge1xuICAgICAgICBhbmNob3I6IG51bGwsXG4gICAgICAgIHZhbHVlOiB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICAgIH07XG4gICAgICB2YXIgd3JhcHBlZCA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbmNob3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5Cb3guZ2V0Qm91bmRpbmdSZWN0KGFuY2hvcnNbaV0uZWxlbWVudCk7XG4gICAgICAgIGlmICgocmVjdC55MSA8PSBjZW50ZXIueSkgJiYgKHJlY3QueTIgPj0gY2VudGVyLnkpKSB7XG4gICAgICAgICAgaWYgKCF3cmFwcGVkKSB7XG4gICAgICAgICAgICBiZXN0ID0ge1xuICAgICAgICAgICAgICBhbmNob3I6IGFuY2hvcnNbaV0sXG4gICAgICAgICAgICAgIHZhbHVlOiByZWN0LnkyIC0gcmVjdC55MVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdyYXBwZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChyZWN0LnkyIC0gcmVjdC55MSA8IGJlc3QudmFsdWUpXG4gICAgICAgICAgICAgIGJlc3QgPSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yOiBhbmNob3JzW2ldLFxuICAgICAgICAgICAgICAgIHZhbHVlOiByZWN0LnkyIC0gcmVjdC55MVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghd3JhcHBlZCkge1xuICAgICAgICAgIGlmIChyZWN0LnkxID4gY2VudGVyLnkgJiYgcmVjdC55MSAtIGNlbnRlci55IDwgYmVzdC52YWx1ZSlcbiAgICAgICAgICAgIGJlc3QgPSB7XG4gICAgICAgICAgICAgIGFuY2hvcjogYW5jaG9yc1tpXSxcbiAgICAgICAgICAgICAgdmFsdWU6IHJlY3QueTEgLSBjZW50ZXIueVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICBlbHNlIGlmIChjZW50ZXIueSA+IHJlY3QueTIgJiYgY2VudGVyLnkgLSByZWN0LnkyIDwgYmVzdC52YWx1ZSlcbiAgICAgICAgICAgIGJlc3QgPSB7XG4gICAgICAgICAgICAgIGFuY2hvcjogYW5jaG9yc1tpXSxcbiAgICAgICAgICAgICAgdmFsdWU6IGNlbnRlci55IC0gcmVjdC55MlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNbYmVzdC5hbmNob3IudHlwZV0uZm9jdXMoYmVzdC5hbmNob3IuZWxlbWVudCwgY2VudGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgJ1JlZmxvdyBFcnJvciAtIEFuY2hvcnMgaW52YWxpZCc7XG4gICAgfVxuICB9LFxuICBnZXROZXdTaXplOiBmdW5jdGlvbihmb2N1cykge1xuICAgIGlmIChmb2N1cy50eXBlID09PSAnVGV4dCcpXG4gICAgICByZXR1cm4gdGhpcy5UZXh0LmdldEJvdW5kaW5nUmVjdChmb2N1cy5ub2RlKTtcbiAgICBlbHNlIGlmIChmb2N1cy50eXBlID09PSAnQm94JylcbiAgICAgIHJldHVybiB0aGlzLkJveC5nZXRCb3VuZGluZ1JlY3QoZm9jdXMuZWxlbWVudCk7XG4gIH0sXG4gIFRleHQ6IHtcbiAgICBnZXRUZXh0Tm9kZXNJbjogZnVuY3Rpb24obm9kZSkge1xuICAgICAgdmFyIHRleHROb2RlcyA9IFtdO1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT0gMykge1xuICAgICAgICB0ZXh0Tm9kZXMucHVzaChub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGROb2RlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgdGV4dE5vZGVzLnB1c2guYXBwbHkodGV4dE5vZGVzLCB0aGlzLmdldFRleHROb2Rlc0luKGNoaWxkcmVuW2ldKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0ZXh0Tm9kZXM7XG4gICAgfSxcbiAgICBnZXRCb3VuZGluZ1JlY3Q6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHZhciByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gICAgICByYW5nZS5zZWxlY3ROb2RlQ29udGVudHMobm9kZSk7XG4gICAgICB2YXIgcmVjdHMgPSByYW5nZS5nZXRDbGllbnRSZWN0cygpO1xuICAgICAgaWYgKCFyZWN0c1swXSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgeTE6IHJlY3RzWzBdLnRvcCxcbiAgICAgICAgeTI6IHJlY3RzW3JlY3RzLmxlbmd0aCAtIDFdLmJvdHRvbVxuICAgICAgfVxuICAgIH0sXG4gICAgZm9jdXM6IGZ1bmN0aW9uKGVsZW1lbnQsIGNlbnRlcikge1xuICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZVJhbmdlICYmIHdpbmRvdy5nZXRTZWxlY3Rpb24pIHtcbiAgICAgICAgdmFyIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKGVsZW1lbnQpO1xuICAgICAgICB2YXIgdGV4dE5vZGVzID0gdGhpcy5nZXRUZXh0Tm9kZXNJbihlbGVtZW50KTtcbiAgICAgICAgLy8gZmluZCBjbG9zZXN0IHZpc2libGUgY2hpbGQgdGV4dE5vZGVcbiAgICAgICAgdmFyIGJlc3QgPSB7XG4gICAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgICBib3VuZGluZ1JlY3Q6IG51bGwsXG4gICAgICAgICAgcG9zOiBudWxsLFxuICAgICAgICAgIGQ6IHdpbmRvdy5pbm5lckhlaWdodFxuICAgICAgICB9O1xuICAgICAgICB2YXIgeTEsIHkyLCBub2RlLCBib3VuZGluZ1JlY3Q7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGV4dE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbm9kZSA9IHRleHROb2Rlc1tpXTtcbiAgICAgICAgICBib3VuZGluZ1JlY3QgPSB0aGlzLmdldEJvdW5kaW5nUmVjdChub2RlKTtcbiAgICAgICAgICBpZiAoIWJvdW5kaW5nUmVjdCkgY29udGludWU7XG4gICAgICAgICAgeTEgPSBib3VuZGluZ1JlY3QueTE7XG4gICAgICAgICAgeTIgPSBib3VuZGluZ1JlY3QueTI7XG4gICAgICAgICAgaWYgKCh5MSA8PSBjZW50ZXIueSkgJiYgKHkyID49IGNlbnRlci55KSkge1xuICAgICAgICAgICAgYmVzdC5ub2RlID0gbm9kZTtcbiAgICAgICAgICAgIGJlc3QuYm91bmRpbmdSZWN0ID0gYm91bmRpbmdSZWN0O1xuICAgICAgICAgICAgYmVzdC5wb3MgPSAwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKCh5MiA8PSBjZW50ZXIueSkgJiYgKGNlbnRlci55IC0geTIgPCBiZXN0LmQpKSB7XG4gICAgICAgICAgICBiZXN0Lm5vZGUgPSBub2RlO1xuICAgICAgICAgICAgYmVzdC5ib3VuZGluZ1JlY3QgPSBib3VuZGluZ1JlY3Q7XG4gICAgICAgICAgICBiZXN0LmQgPSBNYXRoLmFicyhjZW50ZXIueSAtIHkyKTtcbiAgICAgICAgICAgIGJlc3QucG9zID0gLTE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKCh5MSA+PSBjZW50ZXIueSkgJiYgKHkxIC0gY2VudGVyLnkgPCBiZXN0LmQpKSB7XG4gICAgICAgICAgICBiZXN0Lm5vZGUgPSBub2RlO1xuICAgICAgICAgICAgYmVzdC5ib3VuZGluZ1JlY3QgPSBib3VuZGluZ1JlY3Q7XG4gICAgICAgICAgICBiZXN0LmQgPSBNYXRoLmFicyhjZW50ZXIueSAtIHkxKTtcbiAgICAgICAgICAgIGJlc3QucG9zID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBub2RlOiBiZXN0Lm5vZGUsXG4gICAgICAgICAgdHlwZTogJ1RleHQnLFxuICAgICAgICAgIGJvdW5kaW5nUmVjdDogYmVzdC5ib3VuZGluZ1JlY3QsXG4gICAgICAgICAgZGlzdGFuY2VUb0NlbnRlcjogY2VudGVyLnkgLSB5MVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgQm94OiB7XG4gICAgZ2V0Qm91bmRpbmdSZWN0OiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB5MTogcmVjdC50b3AsXG4gICAgICAgIHkyOiByZWN0LmJvdHRvbVxuICAgICAgfVxuICAgIH0sXG4gICAgZm9jdXM6IGZ1bmN0aW9uKGVsZW1lbnQsIGNlbnRlcikge1xuICAgICAgdmFyIGJvdW5kaW5nUmVjdCA9IHRoaXMuZ2V0Qm91bmRpbmdSZWN0KGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZWxlbWVudDogZWxlbWVudCxcbiAgICAgICAgdHlwZTogJ0JveCcsXG4gICAgICAgIGJvdW5kaW5nUmVjdDogYm91bmRpbmdSZWN0LFxuICAgICAgICBkaXN0YW5jZVRvQ2VudGVyOiBjZW50ZXIueSAtIGJvdW5kaW5nUmVjdC55MVxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gSW5pdFJlc2Nyb2xsKG9wdGlvbnMpIHtcbiAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgIHNjcm9sbFRhcmdldDogZG9jdW1lbnQuYm9keSxcbiAgICByZXNpemVUYXJnZXQ6IHdpbmRvdyxcbiAgICBhbmNob3JzOiBudWxsLFxuICAgIGNlbnRlcjoge1xuICAgICAgclg6IDAuNSxcbiAgICAgIHJZOiAwLjVcbiAgICB9XG4gIH07XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgc2Nyb2xsVGFyZ2V0ID0gb3B0aW9ucy5zY3JvbGxUYXJnZXQgfHwgZGVmYXVsdE9wdGlvbnMuc2Nyb2xsVGFyZ2V0O1xuICB2YXIgcmVzaXplVGFyZ2V0ID0gb3B0aW9ucy5yZXNpemVUYXJnZXQgfHwgZGVmYXVsdE9wdGlvbnMucmVzaXplVGFyZ2V0O1xuXG4gIC8vIGVhY2ggYW5jaG9yIG9iamVjdCBpbiB0aGUgYW5jaG9yIGFycmF5XG4gIC8vIHdpbGwgaGF2ZSB0aGUgZm9sbG93aW5nIGZvcm1hdFxuICAvLyB7XG4gIC8vICAgZWxlbWVudDogZG9tIG9iamVjdFxuICAvLyAgIHR5cGU6IHRleHQvaW1hZ2UvdmlkZW8vZmxhc2gvb3RoZXJcbiAgLy8gfVxuICB2YXIgYW5jaG9ycyA9IG9wdGlvbnMuYW5jaG9ycyB8fCBkZWZhdWx0T3B0aW9ucy5hbmNob3JzO1xuXG4gIC8vIGZvciBjb25maWd1cmF0aW9uIG9mIGRlc2lyZWQgY2VudGVyOlxuICAvLyAgICA1MC81MCwgMi8zLCAxLzMuLi5cbiAgdmFyIGNlbnRlck5vcm1hbGl6ZWQgPSB7XG4gICAgclg6IG9wdGlvbnMuZm9jdXNDZW50ZXJYIHx8IGRlZmF1bHRPcHRpb25zLmNlbnRlci5yWCxcbiAgICByWTogb3B0aW9ucy5mb2N1c0NlbnRlclkgfHwgZGVmYXVsdE9wdGlvbnMuY2VudGVyLnJZXG4gIH07XG4gIHZhciBjZW50ZXIgPSB7XG4gICAgeDogbnVsbCxcbiAgICB5OiBudWxsXG4gIH07XG5cbiAgLy8gZXhwb3NlZCBhcGlcbiAgdmFyIGFwaSA9IHt9O1xuXG4gIC8vIHByZXZlbnQgc2Nyb2xsIGhhbmRsZXIgZnJvbSBoYW5kbGluZyBzY3JvbGwgZXZlbnQgY3JlYXRlZFxuICAvLyBieSByZXNjcm9sbCBpbiByZXNpemUgaGFuZGxlclxuICB2YXIgYWxsb3dVcGRhdGUgPSB0cnVlO1xuICB2YXIgZm9jdXMgPSBudWxsO1xuXG4gIC8vIHByaXZhdGUgbWV0aG9kc1xuICBmdW5jdGlvbiB1cGRhdGVGb2N1cygpIHtcbiAgICB2YXIgdnAgPSBVdGlscy52aWV3UG9ydFdpZHRoSGVpZ2h0KCk7XG4gICAgY2VudGVyID0ge1xuICAgICAgeDogY2VudGVyTm9ybWFsaXplZC5yWCAqIHZwLncsXG4gICAgICB5OiBjZW50ZXJOb3JtYWxpemVkLnJZICogdnAuaFxuICAgIH07XG4gICAgZm9jdXMgPSBQcm9jZXNzb3IuZm9jdXMoYW5jaG9ycywgY2VudGVyKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZm9jdXMnLCBmb2N1cyk7XG4gIH1cblxuICBmdW5jdGlvbiByZXNjcm9sbCgpIHtcbiAgICB2YXIgdnAgPSBVdGlscy52aWV3UG9ydFdpZHRoSGVpZ2h0KCk7XG4gICAgY2VudGVyID0ge1xuICAgICAgeDogY2VudGVyTm9ybWFsaXplZC5yWCAqIHZwLncsXG4gICAgICB5OiBjZW50ZXJOb3JtYWxpemVkLnJZICogdnAuaFxuICAgIH07XG4gICAgdmFyIG5ld0JvdW5kaW5nUmVjdCA9IFByb2Nlc3Nvci5nZXROZXdTaXplKGZvY3VzKTtcbiAgICB2YXIgbmV3SGVpZ2h0UmF0aW8gPSAobmV3Qm91bmRpbmdSZWN0LnkyIC0gbmV3Qm91bmRpbmdSZWN0LnkxKSAvIChmb2N1cy5ib3VuZGluZ1JlY3QueTIgLSBmb2N1cy5ib3VuZGluZ1JlY3QueTEpO1xuICAgIHZhciBleHBlY3RlZENlbnRlciA9IHtcbiAgICAgIHk6IG5ld0hlaWdodFJhdGlvICogZm9jdXMuZGlzdGFuY2VUb0NlbnRlciArIG5ld0JvdW5kaW5nUmVjdC55MVxuICAgIH07XG4gICAgdmFyIGRlbHRhID0gZXhwZWN0ZWRDZW50ZXIueSAtIGNlbnRlci55O1xuICAgIHNjcm9sbFRhcmdldC5zY3JvbGxUb3AgKz0gZGVsdGE7XG4gICAgaWYgKE1hdGguYWJzKGRlbHRhKSA+PSAwLjUpXG4gICAgICBhbGxvd1VwZGF0ZSA9IGZhbHNlO1xuICAgIC8vIGNvbnNvbGUubG9nKCdkZWx0YScsIGRlbHRhLCAnLT4gYWxsb3dVcGRhdGUnLCBhbGxvd1VwZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRBbmNob3IoKSB7fVxuICBmdW5jdGlvbiBzZXRBbmNob3IoKSB7fVxuICBmdW5jdGlvbiBhZGRBbmNob3IoKSB7fVxuICBmdW5jdGlvbiByZW1vdmVBbmNob3IoKSB7fVxuICBmdW5jdGlvbiBiaW5kQW5jaG9yKCkge31cbiAgZnVuY3Rpb24gYWxsb3dVcGRhdGUoKSB7fVxuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgLy9zZXQgdXAgcmVzY3JvbGxlciBpbnN0YW5jZVxuICAgIC8vICAyLiBiaW5kIGFuY2hvcnNcbiAgICAvLyAgMy4gYmluZCBvbnNjcm9sbCAmIG9ucmVzaXplXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGZvY3VzKVxuICAgICAgICByZXNjcm9sbCgpO1xuICAgIH0pO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghYWxsb3dVcGRhdGUpIHtcbiAgICAgICAgYWxsb3dVcGRhdGUgPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVGb2N1cygpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHVwZGF0ZUZvY3VzKCk7XG4gIH1cblxuICBpbml0KCk7XG4gIC8vIHB1YmxpYyBtZXRob2RzXG4gIGFwaS5yZXNjcm9sbCA9IHJlc2Nyb2xsO1xuICBhcGkudXBkYXRlRm9jdXMgPSB1cGRhdGVGb2N1cztcbiAgYXBpLmdldEFuY2hvciA9IGdldEFuY2hvcjtcbiAgYXBpLnNldEFuY2hvciA9IHNldEFuY2hvcjtcbiAgYXBpLmFkZEFuY2hvciA9IGFkZEFuY2hvcjtcbiAgYXBpLnJlbW92ZUFuY2hvciA9IHJlbW92ZUFuY2hvcjtcbiAgYXBpLmJpbmRBbmNob3IgPSBiaW5kQW5jaG9yO1xuICByZXR1cm4gYXBpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbml0UmVzY3JvbGw7XG4iXX0=
