(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.InitRescroll = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Utils = {
  viewPortWidthHeight: function getViewport() {
    var viewPortWidth;
    var viewPortHeight;
    // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
    if (typeof window.innerWidth != 'undefined') {
      viewPortWidth = window.innerWidth,
      viewPortHeight = window.innerHeight
    }
    // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
    else if (typeof document.documentElement != 'undefined' &&
      typeof document.documentElement.clientWidth != 'undefined' &&
      document.documentElement.clientWidth != 0) {
      viewPortWidth = document.documentElement.clientWidth,
      viewPortHeight = document.documentElement.clientHeight
    }
    // older versions of IE
    else {
      viewPortWidth = document.getElementsByTagName('body')[0].clientWidth,
      viewPortHeight = document.getElementsByTagName('body')[0].clientHeight
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
      //   1. text: find all text node
      //   2. box:
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
      // based on type, find focus

      // var best = {
      //   anchor: anchors[0],
      //   rect: this.Box.getBoundingRect(anchors[0])
      // };
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
            }
          else if (center.y > rect.y2 && center.y - rect.y2 < best.value)
            best = {
              anchor: anchors[i],
              value: center.y - rect.y2
            }
        }
      }
      return this[best.anchor.type].focus(best.anchor.element, center);
    } else {
      throw "Reflow Error - Anchors invalid";
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
        for (var i = 0; i < textNodes.length; i++) {
          var node = textNodes[i];
          var boundingRect = this.getBoundingRect(node);
          if (!boundingRect) continue;
          var y1 = boundingRect.y1;
          var y2 = boundingRect.y2;
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
    console.log('focus', focus);
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
    console.log('delta', delta, '-> allowUpdate', allowUpdate);
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy5udm0vdmVyc2lvbnMvaW8uanMvdjEuMi4wL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL3Jlc2Nyb2xsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHtcbiAgdmlld1BvcnRXaWR0aEhlaWdodDogZnVuY3Rpb24gZ2V0Vmlld3BvcnQoKSB7XG4gICAgdmFyIHZpZXdQb3J0V2lkdGg7XG4gICAgdmFyIHZpZXdQb3J0SGVpZ2h0O1xuICAgIC8vIHRoZSBtb3JlIHN0YW5kYXJkcyBjb21wbGlhbnQgYnJvd3NlcnMgKG1vemlsbGEvbmV0c2NhcGUvb3BlcmEvSUU3KSB1c2Ugd2luZG93LmlubmVyV2lkdGggYW5kIHdpbmRvdy5pbm5lckhlaWdodFxuICAgIGlmICh0eXBlb2Ygd2luZG93LmlubmVyV2lkdGggIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHZpZXdQb3J0V2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgIHZpZXdQb3J0SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0XG4gICAgfVxuICAgIC8vIElFNiBpbiBzdGFuZGFyZHMgY29tcGxpYW50IG1vZGUgKGkuZS4gd2l0aCBhIHZhbGlkIGRvY3R5cGUgYXMgdGhlIGZpcnN0IGxpbmUgaW4gdGhlIGRvY3VtZW50KVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAhPSAwKSB7XG4gICAgICB2aWV3UG9ydFdpZHRoID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoLFxuICAgICAgdmlld1BvcnRIZWlnaHQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0XG4gICAgfVxuICAgIC8vIG9sZGVyIHZlcnNpb25zIG9mIElFXG4gICAgZWxzZSB7XG4gICAgICB2aWV3UG9ydFdpZHRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXS5jbGllbnRXaWR0aCxcbiAgICAgIHZpZXdQb3J0SGVpZ2h0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXS5jbGllbnRIZWlnaHRcbiAgICB9XG4gICAgcmV0dXJuIHt3OiB2aWV3UG9ydFdpZHRoLCBoOiB2aWV3UG9ydEhlaWdodH07XG4gIH1cbn07XG5cbnZhciBQcm9jZXNzb3IgPSB7XG4gIGZvY3VzOiBmdW5jdGlvbihhbmNob3JzLCBjZW50ZXIpIHtcbiAgICAvLyB1cGRhdGUgZm9jdXMgYnk6XG4gICAgLy8gICAxLiBpZiBubyBhbmNob3JzOiBzZWFyY2hpbmcgdGhyb3VnaCBjaGlsZHJlbiBlbGVtZW50cyBvZiBlbGVtZW50IGF0IGNlbnRlclxuICAgIC8vICAgMi4gaWYgaGFzIGFuY2hvcnM6IHNlYXJjaGluZyB0aHJvdWdoIGFuY2hvciBsaXN0XG4gICAgaWYgKCFhbmNob3JzIHx8ICFhbmNob3JzLmxlbmd0aCkge1xuICAgICAgLy8gZGVmYXVsdCBzZWFyY2gsIG5vIGFuY2hvclxuICAgICAgLy8gZ2V0IGNlbnRlciBlbGVtZW50LCBlaXRoZXIgaW1hZ2Ugb3IgdGV4dFxuICAgICAgLy8gZmluZCBzdWIgYm94ZXNcbiAgICAgIHZhciBjZW50ZXJFbGVtZW50ID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChjZW50ZXIueCwgY2VudGVyLnkpO1xuICAgICAgLy8gc3dpdGNoIGZvY3VzZWQgbm9kZSBmaW5kZXIgYmFzZWQgb24gZWxlbWVudCB0eXBlczpcbiAgICAgIC8vICAgMS4gdGV4dDogZmluZCBhbGwgdGV4dCBub2RlXG4gICAgICAvLyAgIDIuIGJveDpcbiAgICAgIC8vIGZpbmQgZm9jdXMgYmFzZWQgb24gY2VudGVyIHR5cGVcblxuICAgICAgLy8gVE9ETzogc2VwYXJhdGUgbm9ybWFsIGJveCAmIHRleHQgYm94LFxuICAgICAgLy8gIGlmIG5vIHRleHQncyB0b3RhbCBoZWlnaHQgaXMgbm90IGVub3VnaCAtPiB1c2UgQm94XG4gICAgICBpZiAoY2VudGVyRWxlbWVudC50YWdOYW1lID09PSAnSU1BR0UnKVxuICAgICAgICByZXR1cm4gUHJvY2Vzc29yLkJveC5mb2N1cyhjZW50ZXJFbGVtZW50LCBjZW50ZXIpO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gUHJvY2Vzc29yLlRleHQuZm9jdXMoY2VudGVyRWxlbWVudCwgY2VudGVyKTtcbiAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhbmNob3JzKSA9PT0gJ1tvYmplY3QgQXJyYXldJyAmJiBhbmNob3JzLmxlbmd0aCl7XG4gICAgICAvLyBzZWFyY2ggdGhyb3VnaCBhbmNob3IgbGlzdFxuICAgICAgLy8gZmluZCBzbWFsbGVzdCBlbGVtZW50IGluc2lkZSBhbmNob3JzIGFycmF5XG4gICAgICAvLyB0aGF0IGNvbnRhaW5zIGNlbnRlciBjb29yZGluYXRlXG4gICAgICAvLyBiYXNlZCBvbiB0eXBlLCBmaW5kIGZvY3VzXG5cbiAgICAgIC8vIHZhciBiZXN0ID0ge1xuICAgICAgLy8gICBhbmNob3I6IGFuY2hvcnNbMF0sXG4gICAgICAvLyAgIHJlY3Q6IHRoaXMuQm94LmdldEJvdW5kaW5nUmVjdChhbmNob3JzWzBdKVxuICAgICAgLy8gfTtcbiAgICAgIHZhciBiZXN0ID0ge1xuICAgICAgICBhbmNob3I6IG51bGwsXG4gICAgICAgIHZhbHVlOiB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICAgIH07XG4gICAgICB2YXIgd3JhcHBlZCA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbmNob3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5Cb3guZ2V0Qm91bmRpbmdSZWN0KGFuY2hvcnNbaV0uZWxlbWVudCk7XG4gICAgICAgIGlmICgocmVjdC55MSA8PSBjZW50ZXIueSkgJiYgKHJlY3QueTIgPj0gY2VudGVyLnkpKSB7XG4gICAgICAgICAgaWYgKCF3cmFwcGVkKSB7XG4gICAgICAgICAgICBiZXN0ID0ge1xuICAgICAgICAgICAgICBhbmNob3I6IGFuY2hvcnNbaV0sXG4gICAgICAgICAgICAgIHZhbHVlOiByZWN0LnkyIC0gcmVjdC55MVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdyYXBwZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChyZWN0LnkyIC0gcmVjdC55MSA8IGJlc3QudmFsdWUpXG4gICAgICAgICAgICAgIGJlc3QgPSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yOiBhbmNob3JzW2ldLFxuICAgICAgICAgICAgICAgIHZhbHVlOiByZWN0LnkyIC0gcmVjdC55MVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghd3JhcHBlZCkge1xuICAgICAgICAgIGlmIChyZWN0LnkxID4gY2VudGVyLnkgJiYgcmVjdC55MSAtIGNlbnRlci55IDwgYmVzdC52YWx1ZSlcbiAgICAgICAgICAgIGJlc3QgPSB7XG4gICAgICAgICAgICAgIGFuY2hvcjogYW5jaG9yc1tpXSxcbiAgICAgICAgICAgICAgdmFsdWU6IHJlY3QueTEgLSBjZW50ZXIueVxuICAgICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGNlbnRlci55ID4gcmVjdC55MiAmJiBjZW50ZXIueSAtIHJlY3QueTIgPCBiZXN0LnZhbHVlKVxuICAgICAgICAgICAgYmVzdCA9IHtcbiAgICAgICAgICAgICAgYW5jaG9yOiBhbmNob3JzW2ldLFxuICAgICAgICAgICAgICB2YWx1ZTogY2VudGVyLnkgLSByZWN0LnkyXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzW2Jlc3QuYW5jaG9yLnR5cGVdLmZvY3VzKGJlc3QuYW5jaG9yLmVsZW1lbnQsIGNlbnRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IFwiUmVmbG93IEVycm9yIC0gQW5jaG9ycyBpbnZhbGlkXCI7XG4gICAgfVxuICB9LFxuICBnZXROZXdTaXplOiBmdW5jdGlvbihmb2N1cykge1xuICAgIGlmIChmb2N1cy50eXBlID09PSAnVGV4dCcpXG4gICAgICByZXR1cm4gdGhpcy5UZXh0LmdldEJvdW5kaW5nUmVjdChmb2N1cy5ub2RlKTtcbiAgICBlbHNlIGlmIChmb2N1cy50eXBlID09PSAnQm94JylcbiAgICAgIHJldHVybiB0aGlzLkJveC5nZXRCb3VuZGluZ1JlY3QoZm9jdXMuZWxlbWVudCk7XG4gIH0sXG4gIFRleHQ6IHtcbiAgICBnZXRUZXh0Tm9kZXNJbjogZnVuY3Rpb24obm9kZSkge1xuICAgICAgdmFyIHRleHROb2RlcyA9IFtdO1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT0gMykge1xuICAgICAgICB0ZXh0Tm9kZXMucHVzaChub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGROb2RlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgdGV4dE5vZGVzLnB1c2guYXBwbHkodGV4dE5vZGVzLCB0aGlzLmdldFRleHROb2Rlc0luKGNoaWxkcmVuW2ldKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0ZXh0Tm9kZXM7XG4gICAgfSxcbiAgICBnZXRCb3VuZGluZ1JlY3Q6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHZhciByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gICAgICByYW5nZS5zZWxlY3ROb2RlQ29udGVudHMobm9kZSk7XG4gICAgICB2YXIgcmVjdHMgPSByYW5nZS5nZXRDbGllbnRSZWN0cygpO1xuICAgICAgaWYgKCFyZWN0c1swXSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgeTE6IHJlY3RzWzBdLnRvcCxcbiAgICAgICAgeTI6IHJlY3RzW3JlY3RzLmxlbmd0aCAtIDFdLmJvdHRvbVxuICAgICAgfVxuICAgIH0sXG4gICAgZm9jdXM6IGZ1bmN0aW9uKGVsZW1lbnQsIGNlbnRlcikge1xuICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZVJhbmdlICYmIHdpbmRvdy5nZXRTZWxlY3Rpb24pIHtcbiAgICAgICAgdmFyIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKGVsZW1lbnQpO1xuICAgICAgICB2YXIgdGV4dE5vZGVzID0gdGhpcy5nZXRUZXh0Tm9kZXNJbihlbGVtZW50KTtcbiAgICAgICAgLy8gZmluZCBjbG9zZXN0IHZpc2libGUgY2hpbGQgdGV4dE5vZGVcbiAgICAgICAgdmFyIGJlc3QgPSB7XG4gICAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgICBib3VuZGluZ1JlY3Q6IG51bGwsXG4gICAgICAgICAgcG9zOiBudWxsLFxuICAgICAgICAgIGQ6IHdpbmRvdy5pbm5lckhlaWdodFxuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRleHROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciBub2RlID0gdGV4dE5vZGVzW2ldO1xuICAgICAgICAgIHZhciBib3VuZGluZ1JlY3QgPSB0aGlzLmdldEJvdW5kaW5nUmVjdChub2RlKTtcbiAgICAgICAgICBpZiAoIWJvdW5kaW5nUmVjdCkgY29udGludWU7XG4gICAgICAgICAgdmFyIHkxID0gYm91bmRpbmdSZWN0LnkxO1xuICAgICAgICAgIHZhciB5MiA9IGJvdW5kaW5nUmVjdC55MjtcbiAgICAgICAgICBpZiAoKHkxIDw9IGNlbnRlci55KSAmJiAoeTIgPj0gY2VudGVyLnkpKSB7XG4gICAgICAgICAgICBiZXN0Lm5vZGUgPSBub2RlO1xuICAgICAgICAgICAgYmVzdC5ib3VuZGluZ1JlY3QgPSBib3VuZGluZ1JlY3Q7XG4gICAgICAgICAgICBiZXN0LnBvcyA9IDA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoKHkyIDw9IGNlbnRlci55KSAmJiAoY2VudGVyLnkgLSB5MiA8IGJlc3QuZCkpIHtcbiAgICAgICAgICAgIGJlc3Qubm9kZSA9IG5vZGU7XG4gICAgICAgICAgICBiZXN0LmJvdW5kaW5nUmVjdCA9IGJvdW5kaW5nUmVjdDtcbiAgICAgICAgICAgIGJlc3QuZCA9IE1hdGguYWJzKGNlbnRlci55IC0geTIpO1xuICAgICAgICAgICAgYmVzdC5wb3MgPSAtMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoKHkxID49IGNlbnRlci55KSAmJiAoeTEgLSBjZW50ZXIueSA8IGJlc3QuZCkpIHtcbiAgICAgICAgICAgIGJlc3Qubm9kZSA9IG5vZGU7XG4gICAgICAgICAgICBiZXN0LmJvdW5kaW5nUmVjdCA9IGJvdW5kaW5nUmVjdDtcbiAgICAgICAgICAgIGJlc3QuZCA9IE1hdGguYWJzKGNlbnRlci55IC0geTEpO1xuICAgICAgICAgICAgYmVzdC5wb3MgPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5vZGU6IGJlc3Qubm9kZSxcbiAgICAgICAgICB0eXBlOiAnVGV4dCcsXG4gICAgICAgICAgYm91bmRpbmdSZWN0OiBiZXN0LmJvdW5kaW5nUmVjdCxcbiAgICAgICAgICBkaXN0YW5jZVRvQ2VudGVyOiBjZW50ZXIueSAtIHkxXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBCb3g6IHtcbiAgICBnZXRCb3VuZGluZ1JlY3Q6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIHZhciByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHkxOiByZWN0LnRvcCxcbiAgICAgICAgeTI6IHJlY3QuYm90dG9tXG4gICAgICB9XG4gICAgfSxcbiAgICBmb2N1czogZnVuY3Rpb24oZWxlbWVudCwgY2VudGVyKSB7XG4gICAgICB2YXIgYm91bmRpbmdSZWN0ID0gdGhpcy5nZXRCb3VuZGluZ1JlY3QoZWxlbWVudCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxuICAgICAgICB0eXBlOiAnQm94JyxcbiAgICAgICAgYm91bmRpbmdSZWN0OiBib3VuZGluZ1JlY3QsXG4gICAgICAgIGRpc3RhbmNlVG9DZW50ZXI6IGNlbnRlci55IC0gYm91bmRpbmdSZWN0LnkxXG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBJbml0UmVzY3JvbGwob3B0aW9ucykge1xuICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgc2Nyb2xsVGFyZ2V0OiBkb2N1bWVudC5ib2R5LFxuICAgIHJlc2l6ZVRhcmdldDogd2luZG93LFxuICAgIGFuY2hvcnM6IG51bGwsXG4gICAgY2VudGVyOiB7XG4gICAgICByWDogMC41LFxuICAgICAgclk6IDAuNVxuICAgIH1cbiAgfTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBzY3JvbGxUYXJnZXQgPSBvcHRpb25zLnNjcm9sbFRhcmdldCB8fCBkZWZhdWx0T3B0aW9ucy5zY3JvbGxUYXJnZXQ7XG4gIHZhciByZXNpemVUYXJnZXQgPSBvcHRpb25zLnJlc2l6ZVRhcmdldCB8fCBkZWZhdWx0T3B0aW9ucy5yZXNpemVUYXJnZXQ7XG5cbiAgLy8gZWFjaCBhbmNob3Igb2JqZWN0IGluIHRoZSBhbmNob3IgYXJyYXlcbiAgLy8gd2lsbCBoYXZlIHRoZSBmb2xsb3dpbmcgZm9ybWF0XG4gIC8vIHtcbiAgLy8gICBlbGVtZW50OiBkb20gb2JqZWN0XG4gIC8vICAgdHlwZTogdGV4dC9pbWFnZS92aWRlby9mbGFzaC9vdGhlclxuICAvLyB9XG4gIHZhciBhbmNob3JzID0gb3B0aW9ucy5hbmNob3JzIHx8IGRlZmF1bHRPcHRpb25zLmFuY2hvcnM7XG5cbiAgLy8gZm9yIGNvbmZpZ3VyYXRpb24gb2YgZGVzaXJlZCBjZW50ZXI6XG4gIC8vICAgIDUwLzUwLCAyLzMsIDEvMy4uLlxuICB2YXIgY2VudGVyTm9ybWFsaXplZCA9IHtcbiAgICByWDogb3B0aW9ucy5mb2N1c0NlbnRlclggfHwgZGVmYXVsdE9wdGlvbnMuY2VudGVyLnJYLFxuICAgIHJZOiBvcHRpb25zLmZvY3VzQ2VudGVyWSB8fCBkZWZhdWx0T3B0aW9ucy5jZW50ZXIucllcbiAgfTtcbiAgdmFyIGNlbnRlciA9IHtcbiAgICB4OiBudWxsLFxuICAgIHk6IG51bGxcbiAgfTtcblxuICAvLyBleHBvc2VkIGFwaVxuICB2YXIgYXBpID0ge307XG5cbiAgLy8gcHJldmVudCBzY3JvbGwgaGFuZGxlciBmcm9tIGhhbmRsaW5nIHNjcm9sbCBldmVudCBjcmVhdGVkXG4gIC8vIGJ5IHJlc2Nyb2xsIGluIHJlc2l6ZSBoYW5kbGVyXG4gIHZhciBhbGxvd1VwZGF0ZSA9IHRydWU7XG4gIHZhciBmb2N1cyA9IG51bGw7XG5cbiAgLy8gcHJpdmF0ZSBtZXRob2RzXG4gIGZ1bmN0aW9uIHVwZGF0ZUZvY3VzKCkge1xuICAgIHZhciB2cCA9IFV0aWxzLnZpZXdQb3J0V2lkdGhIZWlnaHQoKTtcbiAgICBjZW50ZXIgPSB7XG4gICAgICB4OiBjZW50ZXJOb3JtYWxpemVkLnJYICogdnAudyxcbiAgICAgIHk6IGNlbnRlck5vcm1hbGl6ZWQuclkgKiB2cC5oXG4gICAgfTtcbiAgICBmb2N1cyA9IFByb2Nlc3Nvci5mb2N1cyhhbmNob3JzLCBjZW50ZXIpO1xuICAgIGNvbnNvbGUubG9nKCdmb2N1cycsIGZvY3VzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2Nyb2xsKCkge1xuICAgIHZhciB2cCA9IFV0aWxzLnZpZXdQb3J0V2lkdGhIZWlnaHQoKTtcbiAgICBjZW50ZXIgPSB7XG4gICAgICB4OiBjZW50ZXJOb3JtYWxpemVkLnJYICogdnAudyxcbiAgICAgIHk6IGNlbnRlck5vcm1hbGl6ZWQuclkgKiB2cC5oXG4gICAgfTtcbiAgICB2YXIgbmV3Qm91bmRpbmdSZWN0ID0gUHJvY2Vzc29yLmdldE5ld1NpemUoZm9jdXMpO1xuICAgIHZhciBuZXdIZWlnaHRSYXRpbyA9IChuZXdCb3VuZGluZ1JlY3QueTIgLSBuZXdCb3VuZGluZ1JlY3QueTEpIC8gKGZvY3VzLmJvdW5kaW5nUmVjdC55MiAtIGZvY3VzLmJvdW5kaW5nUmVjdC55MSk7XG4gICAgdmFyIGV4cGVjdGVkQ2VudGVyID0ge1xuICAgICAgeTogbmV3SGVpZ2h0UmF0aW8gKiBmb2N1cy5kaXN0YW5jZVRvQ2VudGVyICsgbmV3Qm91bmRpbmdSZWN0LnkxXG4gICAgfTtcbiAgICB2YXIgZGVsdGEgPSBleHBlY3RlZENlbnRlci55IC0gY2VudGVyLnk7XG4gICAgc2Nyb2xsVGFyZ2V0LnNjcm9sbFRvcCArPSBkZWx0YTtcbiAgICBpZiAoTWF0aC5hYnMoZGVsdGEpID49IDAuNSlcbiAgICAgIGFsbG93VXBkYXRlID0gZmFsc2U7XG4gICAgY29uc29sZS5sb2coJ2RlbHRhJywgZGVsdGEsICctPiBhbGxvd1VwZGF0ZScsIGFsbG93VXBkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIHNldEFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIGFkZEFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIHJlbW92ZUFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIGJpbmRBbmNob3IoKSB7fVxuICBmdW5jdGlvbiBhbGxvd1VwZGF0ZSgpIHt9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAvL3NldCB1cCByZXNjcm9sbGVyIGluc3RhbmNlXG4gICAgLy8gIDIuIGJpbmQgYW5jaG9yc1xuICAgIC8vICAzLiBiaW5kIG9uc2Nyb2xsICYgb25yZXNpemVcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoZm9jdXMpXG4gICAgICAgIHJlc2Nyb2xsKCk7XG4gICAgfSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFhbGxvd1VwZGF0ZSkge1xuICAgICAgICBhbGxvd1VwZGF0ZSA9IHRydWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwZGF0ZUZvY3VzKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBpbml0KCk7XG4gIC8vIHB1YmxpYyBtZXRob2RzXG4gIGFwaS5yZXNjcm9sbCA9IHJlc2Nyb2xsO1xuICBhcGkudXBkYXRlRm9jdXMgPSB1cGRhdGVGb2N1cztcbiAgYXBpLmdldEFuY2hvciA9IGdldEFuY2hvcjtcbiAgYXBpLnNldEFuY2hvciA9IHNldEFuY2hvcjtcbiAgYXBpLmFkZEFuY2hvciA9IGFkZEFuY2hvcjtcbiAgYXBpLnJlbW92ZUFuY2hvciA9IHJlbW92ZUFuY2hvcjtcbiAgYXBpLmJpbmRBbmNob3IgPSBiaW5kQW5jaG9yO1xuICByZXR1cm4gYXBpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbml0UmVzY3JvbGw7XG4iXX0=
