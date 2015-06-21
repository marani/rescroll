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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvcmVzY3JvbGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIFV0aWxzID0ge1xuICB2aWV3UG9ydFdpZHRoSGVpZ2h0OiBmdW5jdGlvbiBnZXRWaWV3cG9ydCgpIHtcbiAgICB2YXIgdmlld1BvcnRXaWR0aDtcbiAgICB2YXIgdmlld1BvcnRIZWlnaHQ7XG4gICAgLy8gdGhlIG1vcmUgc3RhbmRhcmRzIGNvbXBsaWFudCBicm93c2VycyAobW96aWxsYS9uZXRzY2FwZS9vcGVyYS9JRTcpIHVzZSB3aW5kb3cuaW5uZXJXaWR0aCBhbmQgd2luZG93LmlubmVySGVpZ2h0XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cuaW5uZXJXaWR0aCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHZpZXdQb3J0V2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgIHZpZXdQb3J0SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0XG4gICAgfVxuICAgIC8vIElFNiBpbiBzdGFuZGFyZHMgY29tcGxpYW50IG1vZGUgKGkuZS4gd2l0aCBhIHZhbGlkIGRvY3R5cGUgYXMgdGhlIGZpcnN0IGxpbmUgaW4gdGhlIGRvY3VtZW50KVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICE9PSAwKSB7XG4gICAgICB2aWV3UG9ydFdpZHRoID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuICAgICAgdmlld1BvcnRIZWlnaHQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xuICAgIH1cbiAgICAvLyBvbGRlciB2ZXJzaW9ucyBvZiBJRVxuICAgIGVsc2Uge1xuICAgICAgdmlld1BvcnRXaWR0aCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdib2R5JylbMF0uY2xpZW50V2lkdGg7XG4gICAgICB2aWV3UG9ydEhlaWdodCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdib2R5JylbMF0uY2xpZW50SGVpZ2h0O1xuICAgIH1cbiAgICByZXR1cm4ge3c6IHZpZXdQb3J0V2lkdGgsIGg6IHZpZXdQb3J0SGVpZ2h0fTtcbiAgfVxufTtcblxudmFyIFByb2Nlc3NvciA9IHtcbiAgZm9jdXM6IGZ1bmN0aW9uKGFuY2hvcnMsIGNlbnRlcikge1xuICAgIC8vIHVwZGF0ZSBmb2N1cyBieTpcbiAgICAvLyAgIDEuIGlmIG5vIGFuY2hvcnM6IHNlYXJjaGluZyB0aHJvdWdoIGNoaWxkcmVuIGVsZW1lbnRzIG9mIGVsZW1lbnQgYXQgY2VudGVyXG4gICAgLy8gICAyLiBpZiBoYXMgYW5jaG9yczogc2VhcmNoaW5nIHRocm91Z2ggYW5jaG9yIGxpc3RcbiAgICBpZiAoIWFuY2hvcnMgfHwgIWFuY2hvcnMubGVuZ3RoKSB7XG4gICAgICAvLyBkZWZhdWx0IHNlYXJjaCwgbm8gYW5jaG9yXG4gICAgICAvLyBnZXQgY2VudGVyIGVsZW1lbnQsIGVpdGhlciBpbWFnZSBvciB0ZXh0XG4gICAgICAvLyBmaW5kIHN1YiBib3hlc1xuICAgICAgdmFyIGNlbnRlckVsZW1lbnQgPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGNlbnRlci54LCBjZW50ZXIueSk7XG4gICAgICAvLyBzd2l0Y2ggZm9jdXNlZCBub2RlIGZpbmRlciBiYXNlZCBvbiBlbGVtZW50IHR5cGVzOlxuICAgICAgLy8gICAxLiB0ZXh0OiB1c2UgYm91bmRpbmcgcmVjdCBvZiBlYWNoIGRlc2NlbmRhbnQgdGV4dCBub2RlXG4gICAgICAvLyAgIDIuIGJveDogdXNlIGJvdW5kaW5nIHJlY3Qgb2YgaXRzZWxmXG4gICAgICAvLyBmaW5kIGZvY3VzIGJhc2VkIG9uIGNlbnRlciB0eXBlXG5cbiAgICAgIC8vIFRPRE86IHNlcGFyYXRlIG5vcm1hbCBib3ggJiB0ZXh0IGJveCxcbiAgICAgIC8vICBpZiBubyB0ZXh0J3MgdG90YWwgaGVpZ2h0IGlzIG5vdCBlbm91Z2ggLT4gdXNlIEJveFxuICAgICAgaWYgKGNlbnRlckVsZW1lbnQudGFnTmFtZSA9PT0gJ0lNQUdFJylcbiAgICAgICAgcmV0dXJuIFByb2Nlc3Nvci5Cb3guZm9jdXMoY2VudGVyRWxlbWVudCwgY2VudGVyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIFByb2Nlc3Nvci5UZXh0LmZvY3VzKGNlbnRlckVsZW1lbnQsIGNlbnRlcik7XG4gICAgfSBlbHNlIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYW5jaG9ycykgPT09ICdbb2JqZWN0IEFycmF5XScgJiYgYW5jaG9ycy5sZW5ndGgpe1xuICAgICAgLy8gc2VhcmNoIHRocm91Z2ggYW5jaG9yIGxpc3RcbiAgICAgIC8vIGZpbmQgc21hbGxlc3QgZWxlbWVudCBpbnNpZGUgYW5jaG9ycyBhcnJheVxuICAgICAgLy8gdGhhdCBjb250YWlucyBjZW50ZXIgY29vcmRpbmF0ZVxuICAgICAgLy8gdGhlbiBmaW5kIGZvY3VzIGJhc2VkIG9uIGJlc3QgZWxlbWVudFxuXG4gICAgICB2YXIgYmVzdCA9IHtcbiAgICAgICAgYW5jaG9yOiBudWxsLFxuICAgICAgICB2YWx1ZTogd2luZG93LmlubmVySGVpZ2h0XG4gICAgICB9O1xuICAgICAgdmFyIHdyYXBwZWQgPSBmYWxzZTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5jaG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcmVjdCA9IHRoaXMuQm94LmdldEJvdW5kaW5nUmVjdChhbmNob3JzW2ldLmVsZW1lbnQpO1xuICAgICAgICBpZiAoKHJlY3QueTEgPD0gY2VudGVyLnkpICYmIChyZWN0LnkyID49IGNlbnRlci55KSkge1xuICAgICAgICAgIGlmICghd3JhcHBlZCkge1xuICAgICAgICAgICAgYmVzdCA9IHtcbiAgICAgICAgICAgICAgYW5jaG9yOiBhbmNob3JzW2ldLFxuICAgICAgICAgICAgICB2YWx1ZTogcmVjdC55MiAtIHJlY3QueTFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3cmFwcGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAocmVjdC55MiAtIHJlY3QueTEgPCBiZXN0LnZhbHVlKVxuICAgICAgICAgICAgICBiZXN0ID0ge1xuICAgICAgICAgICAgICAgIGFuY2hvcjogYW5jaG9yc1tpXSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogcmVjdC55MiAtIHJlY3QueTFcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIXdyYXBwZWQpIHtcbiAgICAgICAgICBpZiAocmVjdC55MSA+IGNlbnRlci55ICYmIHJlY3QueTEgLSBjZW50ZXIueSA8IGJlc3QudmFsdWUpXG4gICAgICAgICAgICBiZXN0ID0ge1xuICAgICAgICAgICAgICBhbmNob3I6IGFuY2hvcnNbaV0sXG4gICAgICAgICAgICAgIHZhbHVlOiByZWN0LnkxIC0gY2VudGVyLnlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgZWxzZSBpZiAoY2VudGVyLnkgPiByZWN0LnkyICYmIGNlbnRlci55IC0gcmVjdC55MiA8IGJlc3QudmFsdWUpXG4gICAgICAgICAgICBiZXN0ID0ge1xuICAgICAgICAgICAgICBhbmNob3I6IGFuY2hvcnNbaV0sXG4gICAgICAgICAgICAgIHZhbHVlOiBjZW50ZXIueSAtIHJlY3QueTJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzW2Jlc3QuYW5jaG9yLnR5cGVdLmZvY3VzKGJlc3QuYW5jaG9yLmVsZW1lbnQsIGNlbnRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93ICdSZWZsb3cgRXJyb3IgLSBBbmNob3JzIGludmFsaWQnO1xuICAgIH1cbiAgfSxcbiAgZ2V0TmV3U2l6ZTogZnVuY3Rpb24oZm9jdXMpIHtcbiAgICBpZiAoZm9jdXMudHlwZSA9PT0gJ1RleHQnKVxuICAgICAgcmV0dXJuIHRoaXMuVGV4dC5nZXRCb3VuZGluZ1JlY3QoZm9jdXMubm9kZSk7XG4gICAgZWxzZSBpZiAoZm9jdXMudHlwZSA9PT0gJ0JveCcpXG4gICAgICByZXR1cm4gdGhpcy5Cb3guZ2V0Qm91bmRpbmdSZWN0KGZvY3VzLmVsZW1lbnQpO1xuICB9LFxuICBUZXh0OiB7XG4gICAgZ2V0VGV4dE5vZGVzSW46IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHZhciB0ZXh0Tm9kZXMgPSBbXTtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09IDMpIHtcbiAgICAgICAgdGV4dE5vZGVzLnB1c2gobm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkTm9kZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIHRleHROb2Rlcy5wdXNoLmFwcGx5KHRleHROb2RlcywgdGhpcy5nZXRUZXh0Tm9kZXNJbihjaGlsZHJlbltpXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGV4dE5vZGVzO1xuICAgIH0sXG4gICAgZ2V0Qm91bmRpbmdSZWN0OiBmdW5jdGlvbihub2RlKSB7XG4gICAgICB2YXIgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKG5vZGUpO1xuICAgICAgdmFyIHJlY3RzID0gcmFuZ2UuZ2V0Q2xpZW50UmVjdHMoKTtcbiAgICAgIGlmICghcmVjdHNbMF0pXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHkxOiByZWN0c1swXS50b3AsXG4gICAgICAgIHkyOiByZWN0c1tyZWN0cy5sZW5ndGggLSAxXS5ib3R0b21cbiAgICAgIH1cbiAgICB9LFxuICAgIGZvY3VzOiBmdW5jdGlvbihlbGVtZW50LCBjZW50ZXIpIHtcbiAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVSYW5nZSAmJiB3aW5kb3cuZ2V0U2VsZWN0aW9uKSB7XG4gICAgICAgIHZhciByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgIHJhbmdlLnNlbGVjdE5vZGVDb250ZW50cyhlbGVtZW50KTtcbiAgICAgICAgdmFyIHRleHROb2RlcyA9IHRoaXMuZ2V0VGV4dE5vZGVzSW4oZWxlbWVudCk7XG4gICAgICAgIC8vIGZpbmQgY2xvc2VzdCB2aXNpYmxlIGNoaWxkIHRleHROb2RlXG4gICAgICAgIHZhciBiZXN0ID0ge1xuICAgICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgICAgYm91bmRpbmdSZWN0OiBudWxsLFxuICAgICAgICAgIHBvczogbnVsbCxcbiAgICAgICAgICBkOiB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHkxLCB5Miwgbm9kZSwgYm91bmRpbmdSZWN0O1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRleHROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIG5vZGUgPSB0ZXh0Tm9kZXNbaV07XG4gICAgICAgICAgYm91bmRpbmdSZWN0ID0gdGhpcy5nZXRCb3VuZGluZ1JlY3Qobm9kZSk7XG4gICAgICAgICAgaWYgKCFib3VuZGluZ1JlY3QpIGNvbnRpbnVlO1xuICAgICAgICAgIHkxID0gYm91bmRpbmdSZWN0LnkxO1xuICAgICAgICAgIHkyID0gYm91bmRpbmdSZWN0LnkyO1xuICAgICAgICAgIGlmICgoeTEgPD0gY2VudGVyLnkpICYmICh5MiA+PSBjZW50ZXIueSkpIHtcbiAgICAgICAgICAgIGJlc3Qubm9kZSA9IG5vZGU7XG4gICAgICAgICAgICBiZXN0LmJvdW5kaW5nUmVjdCA9IGJvdW5kaW5nUmVjdDtcbiAgICAgICAgICAgIGJlc3QucG9zID0gMDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICgoeTIgPD0gY2VudGVyLnkpICYmIChjZW50ZXIueSAtIHkyIDwgYmVzdC5kKSkge1xuICAgICAgICAgICAgYmVzdC5ub2RlID0gbm9kZTtcbiAgICAgICAgICAgIGJlc3QuYm91bmRpbmdSZWN0ID0gYm91bmRpbmdSZWN0O1xuICAgICAgICAgICAgYmVzdC5kID0gTWF0aC5hYnMoY2VudGVyLnkgLSB5Mik7XG4gICAgICAgICAgICBiZXN0LnBvcyA9IC0xO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICgoeTEgPj0gY2VudGVyLnkpICYmICh5MSAtIGNlbnRlci55IDwgYmVzdC5kKSkge1xuICAgICAgICAgICAgYmVzdC5ub2RlID0gbm9kZTtcbiAgICAgICAgICAgIGJlc3QuYm91bmRpbmdSZWN0ID0gYm91bmRpbmdSZWN0O1xuICAgICAgICAgICAgYmVzdC5kID0gTWF0aC5hYnMoY2VudGVyLnkgLSB5MSk7XG4gICAgICAgICAgICBiZXN0LnBvcyA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbm9kZTogYmVzdC5ub2RlLFxuICAgICAgICAgIHR5cGU6ICdUZXh0JyxcbiAgICAgICAgICBib3VuZGluZ1JlY3Q6IGJlc3QuYm91bmRpbmdSZWN0LFxuICAgICAgICAgIGRpc3RhbmNlVG9DZW50ZXI6IGNlbnRlci55IC0geTFcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIEJveDoge1xuICAgIGdldEJvdW5kaW5nUmVjdDogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgdmFyIHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgeTE6IHJlY3QudG9wLFxuICAgICAgICB5MjogcmVjdC5ib3R0b21cbiAgICAgIH1cbiAgICB9LFxuICAgIGZvY3VzOiBmdW5jdGlvbihlbGVtZW50LCBjZW50ZXIpIHtcbiAgICAgIHZhciBib3VuZGluZ1JlY3QgPSB0aGlzLmdldEJvdW5kaW5nUmVjdChlbGVtZW50KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXG4gICAgICAgIHR5cGU6ICdCb3gnLFxuICAgICAgICBib3VuZGluZ1JlY3Q6IGJvdW5kaW5nUmVjdCxcbiAgICAgICAgZGlzdGFuY2VUb0NlbnRlcjogY2VudGVyLnkgLSBib3VuZGluZ1JlY3QueTFcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIEluaXRSZXNjcm9sbChvcHRpb25zKSB7XG4gIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICBzY3JvbGxUYXJnZXQ6IGRvY3VtZW50LmJvZHksXG4gICAgcmVzaXplVGFyZ2V0OiB3aW5kb3csXG4gICAgYW5jaG9yczogbnVsbCxcbiAgICBjZW50ZXI6IHtcbiAgICAgIHJYOiAwLjUsXG4gICAgICByWTogMC41XG4gICAgfVxuICB9O1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHNjcm9sbFRhcmdldCA9IG9wdGlvbnMuc2Nyb2xsVGFyZ2V0IHx8IGRlZmF1bHRPcHRpb25zLnNjcm9sbFRhcmdldDtcbiAgdmFyIHJlc2l6ZVRhcmdldCA9IG9wdGlvbnMucmVzaXplVGFyZ2V0IHx8IGRlZmF1bHRPcHRpb25zLnJlc2l6ZVRhcmdldDtcblxuICAvLyBlYWNoIGFuY2hvciBvYmplY3QgaW4gdGhlIGFuY2hvciBhcnJheVxuICAvLyB3aWxsIGhhdmUgdGhlIGZvbGxvd2luZyBmb3JtYXRcbiAgLy8ge1xuICAvLyAgIGVsZW1lbnQ6IGRvbSBvYmplY3RcbiAgLy8gICB0eXBlOiB0ZXh0L2ltYWdlL3ZpZGVvL2ZsYXNoL290aGVyXG4gIC8vIH1cbiAgdmFyIGFuY2hvcnMgPSBvcHRpb25zLmFuY2hvcnMgfHwgZGVmYXVsdE9wdGlvbnMuYW5jaG9ycztcblxuICAvLyBmb3IgY29uZmlndXJhdGlvbiBvZiBkZXNpcmVkIGNlbnRlcjpcbiAgLy8gICAgNTAvNTAsIDIvMywgMS8zLi4uXG4gIHZhciBjZW50ZXJOb3JtYWxpemVkID0ge1xuICAgIHJYOiBvcHRpb25zLmZvY3VzQ2VudGVyWCB8fCBkZWZhdWx0T3B0aW9ucy5jZW50ZXIuclgsXG4gICAgclk6IG9wdGlvbnMuZm9jdXNDZW50ZXJZIHx8IGRlZmF1bHRPcHRpb25zLmNlbnRlci5yWVxuICB9O1xuICB2YXIgY2VudGVyID0ge1xuICAgIHg6IG51bGwsXG4gICAgeTogbnVsbFxuICB9O1xuXG4gIC8vIGV4cG9zZWQgYXBpXG4gIHZhciBhcGkgPSB7fTtcblxuICAvLyBwcmV2ZW50IHNjcm9sbCBoYW5kbGVyIGZyb20gaGFuZGxpbmcgc2Nyb2xsIGV2ZW50IGNyZWF0ZWRcbiAgLy8gYnkgcmVzY3JvbGwgaW4gcmVzaXplIGhhbmRsZXJcbiAgdmFyIGFsbG93VXBkYXRlID0gdHJ1ZTtcbiAgdmFyIGZvY3VzID0gbnVsbDtcblxuICAvLyBwcml2YXRlIG1ldGhvZHNcbiAgZnVuY3Rpb24gdXBkYXRlRm9jdXMoKSB7XG4gICAgdmFyIHZwID0gVXRpbHMudmlld1BvcnRXaWR0aEhlaWdodCgpO1xuICAgIGNlbnRlciA9IHtcbiAgICAgIHg6IGNlbnRlck5vcm1hbGl6ZWQuclggKiB2cC53LFxuICAgICAgeTogY2VudGVyTm9ybWFsaXplZC5yWSAqIHZwLmhcbiAgICB9O1xuICAgIGZvY3VzID0gUHJvY2Vzc29yLmZvY3VzKGFuY2hvcnMsIGNlbnRlcik7XG4gICAgLy8gY29uc29sZS5sb2coJ2ZvY3VzJywgZm9jdXMpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzY3JvbGwoKSB7XG4gICAgdmFyIHZwID0gVXRpbHMudmlld1BvcnRXaWR0aEhlaWdodCgpO1xuICAgIGNlbnRlciA9IHtcbiAgICAgIHg6IGNlbnRlck5vcm1hbGl6ZWQuclggKiB2cC53LFxuICAgICAgeTogY2VudGVyTm9ybWFsaXplZC5yWSAqIHZwLmhcbiAgICB9O1xuICAgIHZhciBuZXdCb3VuZGluZ1JlY3QgPSBQcm9jZXNzb3IuZ2V0TmV3U2l6ZShmb2N1cyk7XG4gICAgdmFyIG5ld0hlaWdodFJhdGlvID0gKG5ld0JvdW5kaW5nUmVjdC55MiAtIG5ld0JvdW5kaW5nUmVjdC55MSkgLyAoZm9jdXMuYm91bmRpbmdSZWN0LnkyIC0gZm9jdXMuYm91bmRpbmdSZWN0LnkxKTtcbiAgICB2YXIgZXhwZWN0ZWRDZW50ZXIgPSB7XG4gICAgICB5OiBuZXdIZWlnaHRSYXRpbyAqIGZvY3VzLmRpc3RhbmNlVG9DZW50ZXIgKyBuZXdCb3VuZGluZ1JlY3QueTFcbiAgICB9O1xuICAgIHZhciBkZWx0YSA9IGV4cGVjdGVkQ2VudGVyLnkgLSBjZW50ZXIueTtcbiAgICBzY3JvbGxUYXJnZXQuc2Nyb2xsVG9wICs9IGRlbHRhO1xuICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPj0gMC41KVxuICAgICAgYWxsb3dVcGRhdGUgPSBmYWxzZTtcbiAgICAvLyBjb25zb2xlLmxvZygnZGVsdGEnLCBkZWx0YSwgJy0+IGFsbG93VXBkYXRlJywgYWxsb3dVcGRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QW5jaG9yKCkge31cbiAgZnVuY3Rpb24gc2V0QW5jaG9yKCkge31cbiAgZnVuY3Rpb24gYWRkQW5jaG9yKCkge31cbiAgZnVuY3Rpb24gcmVtb3ZlQW5jaG9yKCkge31cbiAgZnVuY3Rpb24gYmluZEFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIGFsbG93VXBkYXRlKCkge31cblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIC8vc2V0IHVwIHJlc2Nyb2xsZXIgaW5zdGFuY2VcbiAgICAvLyAgMi4gYmluZCBhbmNob3JzXG4gICAgLy8gIDMuIGJpbmQgb25zY3JvbGwgJiBvbnJlc2l6ZVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChmb2N1cylcbiAgICAgICAgcmVzY3JvbGwoKTtcbiAgICB9KTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWFsbG93VXBkYXRlKSB7XG4gICAgICAgIGFsbG93VXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXBkYXRlRm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGluaXQoKTtcbiAgLy8gcHVibGljIG1ldGhvZHNcbiAgYXBpLnJlc2Nyb2xsID0gcmVzY3JvbGw7XG4gIGFwaS51cGRhdGVGb2N1cyA9IHVwZGF0ZUZvY3VzO1xuICBhcGkuZ2V0QW5jaG9yID0gZ2V0QW5jaG9yO1xuICBhcGkuc2V0QW5jaG9yID0gc2V0QW5jaG9yO1xuICBhcGkuYWRkQW5jaG9yID0gYWRkQW5jaG9yO1xuICBhcGkucmVtb3ZlQW5jaG9yID0gcmVtb3ZlQW5jaG9yO1xuICBhcGkuYmluZEFuY2hvciA9IGJpbmRBbmNob3I7XG4gIHJldHVybiBhcGk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluaXRSZXNjcm9sbDtcbiJdfQ==
