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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvcmVzY3JvbGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHtcbiAgdmlld1BvcnRXaWR0aEhlaWdodDogZnVuY3Rpb24gZ2V0Vmlld3BvcnQoKSB7XG4gICAgdmFyIHZpZXdQb3J0V2lkdGg7XG4gICAgdmFyIHZpZXdQb3J0SGVpZ2h0O1xuICAgIC8vIHRoZSBtb3JlIHN0YW5kYXJkcyBjb21wbGlhbnQgYnJvd3NlcnMgKG1vemlsbGEvbmV0c2NhcGUvb3BlcmEvSUU3KSB1c2Ugd2luZG93LmlubmVyV2lkdGggYW5kIHdpbmRvdy5pbm5lckhlaWdodFxuICAgIGlmICh0eXBlb2Ygd2luZG93LmlubmVyV2lkdGggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB2aWV3UG9ydFdpZHRoID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICB2aWV3UG9ydEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodFxuICAgIH1cbiAgICAvLyBJRTYgaW4gc3RhbmRhcmRzIGNvbXBsaWFudCBtb2RlIChpLmUuIHdpdGggYSB2YWxpZCBkb2N0eXBlIGFzIHRoZSBmaXJzdCBsaW5lIGluIHRoZSBkb2N1bWVudClcbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAhPT0gMCkge1xuICAgICAgdmlld1BvcnRXaWR0aCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aDtcbiAgICAgIHZpZXdQb3J0SGVpZ2h0ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodDtcbiAgICB9XG4gICAgLy8gb2xkZXIgdmVyc2lvbnMgb2YgSUVcbiAgICBlbHNlIHtcbiAgICAgIHZpZXdQb3J0V2lkdGggPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYm9keScpWzBdLmNsaWVudFdpZHRoO1xuICAgICAgdmlld1BvcnRIZWlnaHQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYm9keScpWzBdLmNsaWVudEhlaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIHt3OiB2aWV3UG9ydFdpZHRoLCBoOiB2aWV3UG9ydEhlaWdodH07XG4gIH0sXG4gIGRvY3VtZW50U2Nyb2xsVGFyZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgKz0gMTtcbiAgICBpZiAoZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgPT09IDApIHtcbiAgICAgIHJldHVybiAnZG9jdW1lbnRFbGVtZW50JztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCAtPSAxO1xuICAgICAgcmV0dXJuICdib2R5JztcbiAgICB9XG4gIH1cbn07XG5cbnZhciBQcm9jZXNzb3IgPSB7XG4gIGZvY3VzOiBmdW5jdGlvbihhbmNob3JzLCBjZW50ZXIpIHtcbiAgICAvLyB1cGRhdGUgZm9jdXMgYnk6XG4gICAgLy8gICAxLiBpZiBubyBhbmNob3JzOiBzZWFyY2hpbmcgdGhyb3VnaCBjaGlsZHJlbiBlbGVtZW50cyBvZiBlbGVtZW50IGF0IGNlbnRlclxuICAgIC8vICAgMi4gaWYgaGFzIGFuY2hvcnM6IHNlYXJjaGluZyB0aHJvdWdoIGFuY2hvciBsaXN0XG4gICAgaWYgKCFhbmNob3JzIHx8ICFhbmNob3JzLmxlbmd0aCkge1xuICAgICAgLy8gZGVmYXVsdCBzZWFyY2gsIG5vIGFuY2hvclxuICAgICAgLy8gZ2V0IGNlbnRlciBlbGVtZW50LCBlaXRoZXIgaW1hZ2Ugb3IgdGV4dFxuICAgICAgLy8gZmluZCBzdWIgYm94ZXNcbiAgICAgIHZhciBjZW50ZXJFbGVtZW50ID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChjZW50ZXIueCwgY2VudGVyLnkpO1xuICAgICAgLy8gc3dpdGNoIGZvY3VzZWQgbm9kZSBmaW5kZXIgYmFzZWQgb24gZWxlbWVudCB0eXBlczpcbiAgICAgIC8vICAgMS4gdGV4dDogdXNlIGJvdW5kaW5nIHJlY3Qgb2YgZWFjaCBkZXNjZW5kYW50IHRleHQgbm9kZVxuICAgICAgLy8gICAyLiBib3g6IHVzZSBib3VuZGluZyByZWN0IG9mIGl0c2VsZlxuICAgICAgLy8gZmluZCBmb2N1cyBiYXNlZCBvbiBjZW50ZXIgdHlwZVxuXG4gICAgICAvLyBUT0RPOiBzZXBhcmF0ZSBub3JtYWwgYm94ICYgdGV4dCBib3gsXG4gICAgICAvLyAgaWYgbm8gdGV4dCdzIHRvdGFsIGhlaWdodCBpcyBub3QgZW5vdWdoIC0+IHVzZSBCb3hcbiAgICAgIGlmIChjZW50ZXJFbGVtZW50LnRhZ05hbWUgPT09ICdJTUFHRScpXG4gICAgICAgIHJldHVybiBQcm9jZXNzb3IuQm94LmZvY3VzKGNlbnRlckVsZW1lbnQsIGNlbnRlcik7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiBQcm9jZXNzb3IuVGV4dC5mb2N1cyhjZW50ZXJFbGVtZW50LCBjZW50ZXIpO1xuICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFuY2hvcnMpID09PSAnW29iamVjdCBBcnJheV0nICYmIGFuY2hvcnMubGVuZ3RoKXtcbiAgICAgIC8vIHNlYXJjaCB0aHJvdWdoIGFuY2hvciBsaXN0XG4gICAgICAvLyBmaW5kIHNtYWxsZXN0IGVsZW1lbnQgaW5zaWRlIGFuY2hvcnMgYXJyYXlcbiAgICAgIC8vIHRoYXQgY29udGFpbnMgY2VudGVyIGNvb3JkaW5hdGVcbiAgICAgIC8vIHRoZW4gZmluZCBmb2N1cyBiYXNlZCBvbiBiZXN0IGVsZW1lbnRcblxuICAgICAgdmFyIGJlc3QgPSB7XG4gICAgICAgIGFuY2hvcjogbnVsbCxcbiAgICAgICAgdmFsdWU6IHdpbmRvdy5pbm5lckhlaWdodFxuICAgICAgfTtcbiAgICAgIHZhciB3cmFwcGVkID0gZmFsc2U7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFuY2hvcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHJlY3QgPSB0aGlzLkJveC5nZXRCb3VuZGluZ1JlY3QoYW5jaG9yc1tpXS5lbGVtZW50KTtcbiAgICAgICAgaWYgKChyZWN0LnkxIDw9IGNlbnRlci55KSAmJiAocmVjdC55MiA+PSBjZW50ZXIueSkpIHtcbiAgICAgICAgICBpZiAoIXdyYXBwZWQpIHtcbiAgICAgICAgICAgIGJlc3QgPSB7XG4gICAgICAgICAgICAgIGFuY2hvcjogYW5jaG9yc1tpXSxcbiAgICAgICAgICAgICAgdmFsdWU6IHJlY3QueTIgLSByZWN0LnkxXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd3JhcHBlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHJlY3QueTIgLSByZWN0LnkxIDwgYmVzdC52YWx1ZSlcbiAgICAgICAgICAgICAgYmVzdCA9IHtcbiAgICAgICAgICAgICAgICBhbmNob3I6IGFuY2hvcnNbaV0sXG4gICAgICAgICAgICAgICAgdmFsdWU6IHJlY3QueTIgLSByZWN0LnkxXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCF3cmFwcGVkKSB7XG4gICAgICAgICAgaWYgKHJlY3QueTEgPiBjZW50ZXIueSAmJiByZWN0LnkxIC0gY2VudGVyLnkgPCBiZXN0LnZhbHVlKVxuICAgICAgICAgICAgYmVzdCA9IHtcbiAgICAgICAgICAgICAgYW5jaG9yOiBhbmNob3JzW2ldLFxuICAgICAgICAgICAgICB2YWx1ZTogcmVjdC55MSAtIGNlbnRlci55XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIGVsc2UgaWYgKGNlbnRlci55ID4gcmVjdC55MiAmJiBjZW50ZXIueSAtIHJlY3QueTIgPCBiZXN0LnZhbHVlKVxuICAgICAgICAgICAgYmVzdCA9IHtcbiAgICAgICAgICAgICAgYW5jaG9yOiBhbmNob3JzW2ldLFxuICAgICAgICAgICAgICB2YWx1ZTogY2VudGVyLnkgLSByZWN0LnkyXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1tiZXN0LmFuY2hvci50eXBlXS5mb2N1cyhiZXN0LmFuY2hvci5lbGVtZW50LCBjZW50ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyAnUmVmbG93IEVycm9yIC0gQW5jaG9ycyBpbnZhbGlkJztcbiAgICB9XG4gIH0sXG4gIGdldE5ld1NpemU6IGZ1bmN0aW9uKGZvY3VzKSB7XG4gICAgaWYgKGZvY3VzLnR5cGUgPT09ICdUZXh0JylcbiAgICAgIHJldHVybiB0aGlzLlRleHQuZ2V0Qm91bmRpbmdSZWN0KGZvY3VzLm5vZGUpO1xuICAgIGVsc2UgaWYgKGZvY3VzLnR5cGUgPT09ICdCb3gnKVxuICAgICAgcmV0dXJuIHRoaXMuQm94LmdldEJvdW5kaW5nUmVjdChmb2N1cy5lbGVtZW50KTtcbiAgfSxcbiAgVGV4dDoge1xuICAgIGdldFRleHROb2Rlc0luOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICB2YXIgdGV4dE5vZGVzID0gW107XG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PSAzKSB7XG4gICAgICAgIHRleHROb2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICB0ZXh0Tm9kZXMucHVzaC5hcHBseSh0ZXh0Tm9kZXMsIHRoaXMuZ2V0VGV4dE5vZGVzSW4oY2hpbGRyZW5baV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRleHROb2RlcztcbiAgICB9LFxuICAgIGdldEJvdW5kaW5nUmVjdDogZnVuY3Rpb24obm9kZSkge1xuICAgICAgdmFyIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICAgIHJhbmdlLnNlbGVjdE5vZGVDb250ZW50cyhub2RlKTtcbiAgICAgIHZhciByZWN0cyA9IHJhbmdlLmdldENsaWVudFJlY3RzKCk7XG4gICAgICBpZiAoIXJlY3RzWzBdKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB5MTogcmVjdHNbMF0udG9wLFxuICAgICAgICB5MjogcmVjdHNbcmVjdHMubGVuZ3RoIC0gMV0uYm90dG9tXG4gICAgICB9XG4gICAgfSxcbiAgICBmb2N1czogZnVuY3Rpb24oZWxlbWVudCwgY2VudGVyKSB7XG4gICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlUmFuZ2UgJiYgd2luZG93LmdldFNlbGVjdGlvbikge1xuICAgICAgICB2YXIgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgICAgICByYW5nZS5zZWxlY3ROb2RlQ29udGVudHMoZWxlbWVudCk7XG4gICAgICAgIHZhciB0ZXh0Tm9kZXMgPSB0aGlzLmdldFRleHROb2Rlc0luKGVsZW1lbnQpO1xuICAgICAgICAvLyBmaW5kIGNsb3Nlc3QgdmlzaWJsZSBjaGlsZCB0ZXh0Tm9kZVxuICAgICAgICB2YXIgYmVzdCA9IHtcbiAgICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICAgIGJvdW5kaW5nUmVjdDogbnVsbCxcbiAgICAgICAgICBwb3M6IG51bGwsXG4gICAgICAgICAgZDogd2luZG93LmlubmVySGVpZ2h0XG4gICAgICAgIH07XG4gICAgICAgIHZhciB5MSwgeTIsIG5vZGUsIGJvdW5kaW5nUmVjdDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZXh0Tm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBub2RlID0gdGV4dE5vZGVzW2ldO1xuICAgICAgICAgIGJvdW5kaW5nUmVjdCA9IHRoaXMuZ2V0Qm91bmRpbmdSZWN0KG5vZGUpO1xuICAgICAgICAgIGlmICghYm91bmRpbmdSZWN0KSBjb250aW51ZTtcbiAgICAgICAgICB5MSA9IGJvdW5kaW5nUmVjdC55MTtcbiAgICAgICAgICB5MiA9IGJvdW5kaW5nUmVjdC55MjtcbiAgICAgICAgICBpZiAoKHkxIDw9IGNlbnRlci55KSAmJiAoeTIgPj0gY2VudGVyLnkpKSB7XG4gICAgICAgICAgICBiZXN0Lm5vZGUgPSBub2RlO1xuICAgICAgICAgICAgYmVzdC5ib3VuZGluZ1JlY3QgPSBib3VuZGluZ1JlY3Q7XG4gICAgICAgICAgICBiZXN0LnBvcyA9IDA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoKHkyIDw9IGNlbnRlci55KSAmJiAoY2VudGVyLnkgLSB5MiA8IGJlc3QuZCkpIHtcbiAgICAgICAgICAgIGJlc3Qubm9kZSA9IG5vZGU7XG4gICAgICAgICAgICBiZXN0LmJvdW5kaW5nUmVjdCA9IGJvdW5kaW5nUmVjdDtcbiAgICAgICAgICAgIGJlc3QuZCA9IE1hdGguYWJzKGNlbnRlci55IC0geTIpO1xuICAgICAgICAgICAgYmVzdC5wb3MgPSAtMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoKHkxID49IGNlbnRlci55KSAmJiAoeTEgLSBjZW50ZXIueSA8IGJlc3QuZCkpIHtcbiAgICAgICAgICAgIGJlc3Qubm9kZSA9IG5vZGU7XG4gICAgICAgICAgICBiZXN0LmJvdW5kaW5nUmVjdCA9IGJvdW5kaW5nUmVjdDtcbiAgICAgICAgICAgIGJlc3QuZCA9IE1hdGguYWJzKGNlbnRlci55IC0geTEpO1xuICAgICAgICAgICAgYmVzdC5wb3MgPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5vZGU6IGJlc3Qubm9kZSxcbiAgICAgICAgICB0eXBlOiAnVGV4dCcsXG4gICAgICAgICAgYm91bmRpbmdSZWN0OiBiZXN0LmJvdW5kaW5nUmVjdCxcbiAgICAgICAgICBkaXN0YW5jZVRvQ2VudGVyOiBjZW50ZXIueSAtIHkxXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBCb3g6IHtcbiAgICBnZXRCb3VuZGluZ1JlY3Q6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIHZhciByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHkxOiByZWN0LnRvcCxcbiAgICAgICAgeTI6IHJlY3QuYm90dG9tXG4gICAgICB9XG4gICAgfSxcbiAgICBmb2N1czogZnVuY3Rpb24oZWxlbWVudCwgY2VudGVyKSB7XG4gICAgICB2YXIgYm91bmRpbmdSZWN0ID0gdGhpcy5nZXRCb3VuZGluZ1JlY3QoZWxlbWVudCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxuICAgICAgICB0eXBlOiAnQm94JyxcbiAgICAgICAgYm91bmRpbmdSZWN0OiBib3VuZGluZ1JlY3QsXG4gICAgICAgIGRpc3RhbmNlVG9DZW50ZXI6IGNlbnRlci55IC0gYm91bmRpbmdSZWN0LnkxXG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBJbml0UmVzY3JvbGwob3B0aW9ucykge1xuICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgc2Nyb2xsVGFyZ2V0OiBkb2N1bWVudFtVdGlscy5kb2N1bWVudFNjcm9sbFRhcmdldCgpXSxcbiAgICByZXNpemVUYXJnZXQ6IHdpbmRvdyxcbiAgICBhbmNob3JzOiBudWxsLFxuICAgIGNlbnRlcjoge1xuICAgICAgclg6IDAuNSxcbiAgICAgIHJZOiAwLjVcbiAgICB9XG4gIH07XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgc2Nyb2xsVGFyZ2V0ID0gb3B0aW9ucy5zY3JvbGxUYXJnZXQgfHwgZGVmYXVsdE9wdGlvbnMuc2Nyb2xsVGFyZ2V0O1xuICB2YXIgcmVzaXplVGFyZ2V0ID0gb3B0aW9ucy5yZXNpemVUYXJnZXQgfHwgZGVmYXVsdE9wdGlvbnMucmVzaXplVGFyZ2V0O1xuXG4gIC8vIGVhY2ggYW5jaG9yIG9iamVjdCBpbiB0aGUgYW5jaG9yIGFycmF5XG4gIC8vIHdpbGwgaGF2ZSB0aGUgZm9sbG93aW5nIGZvcm1hdFxuICAvLyB7XG4gIC8vICAgZWxlbWVudDogZG9tIG9iamVjdFxuICAvLyAgIHR5cGU6IHRleHQvaW1hZ2UvdmlkZW8vZmxhc2gvb3RoZXJcbiAgLy8gfVxuICB2YXIgYW5jaG9ycyA9IG9wdGlvbnMuYW5jaG9ycyB8fCBkZWZhdWx0T3B0aW9ucy5hbmNob3JzO1xuXG4gIC8vIGZvciBjb25maWd1cmF0aW9uIG9mIGRlc2lyZWQgY2VudGVyOlxuICAvLyAgICA1MC81MCwgMi8zLCAxLzMuLi5cbiAgdmFyIGNlbnRlck5vcm1hbGl6ZWQgPSB7XG4gICAgclg6IG9wdGlvbnMuZm9jdXNDZW50ZXJYIHx8IGRlZmF1bHRPcHRpb25zLmNlbnRlci5yWCxcbiAgICByWTogb3B0aW9ucy5mb2N1c0NlbnRlclkgfHwgZGVmYXVsdE9wdGlvbnMuY2VudGVyLnJZXG4gIH07XG4gIHZhciBjZW50ZXIgPSB7XG4gICAgeDogbnVsbCxcbiAgICB5OiBudWxsXG4gIH07XG5cbiAgLy8gZXhwb3NlZCBhcGlcbiAgdmFyIGFwaSA9IHt9O1xuICAvLyBwcmV2ZW50IHNjcm9sbCBoYW5kbGVyIGZyb20gaGFuZGxpbmcgc2Nyb2xsIGV2ZW50IGNyZWF0ZWRcbiAgLy8gYnkgcmVzY3JvbGwgaW4gcmVzaXplIGhhbmRsZXJcbiAgdmFyIGFsbG93VXBkYXRlID0gdHJ1ZTtcbiAgdmFyIGZvY3VzID0gbnVsbDtcblxuICAvLyBhY3RpdmF0ZSAmIGRlYWN0aXZhdGVcbiAgdmFyIGFjdGl2ZSA9IHRydWU7XG5cbiAgLy8gcHJpdmF0ZSBtZXRob2RzXG4gIGZ1bmN0aW9uIHVwZGF0ZUZvY3VzKCkge1xuICAgIHZhciB2cCA9IFV0aWxzLnZpZXdQb3J0V2lkdGhIZWlnaHQoKTtcbiAgICBjZW50ZXIgPSB7XG4gICAgICB4OiBjZW50ZXJOb3JtYWxpemVkLnJYICogdnAudyxcbiAgICAgIHk6IGNlbnRlck5vcm1hbGl6ZWQuclkgKiB2cC5oXG4gICAgfTtcbiAgICBmb2N1cyA9IFByb2Nlc3Nvci5mb2N1cyhhbmNob3JzLCBjZW50ZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzY3JvbGwoKSB7XG4gICAgdmFyIHZwID0gVXRpbHMudmlld1BvcnRXaWR0aEhlaWdodCgpO1xuICAgIGNlbnRlciA9IHtcbiAgICAgIHg6IGNlbnRlck5vcm1hbGl6ZWQuclggKiB2cC53LFxuICAgICAgeTogY2VudGVyTm9ybWFsaXplZC5yWSAqIHZwLmhcbiAgICB9O1xuICAgIHZhciBuZXdCb3VuZGluZ1JlY3QgPSBQcm9jZXNzb3IuZ2V0TmV3U2l6ZShmb2N1cyk7XG4gICAgdmFyIG5ld0hlaWdodFJhdGlvID0gKG5ld0JvdW5kaW5nUmVjdC55MiAtIG5ld0JvdW5kaW5nUmVjdC55MSkgLyAoZm9jdXMuYm91bmRpbmdSZWN0LnkyIC0gZm9jdXMuYm91bmRpbmdSZWN0LnkxKTtcbiAgICB2YXIgZXhwZWN0ZWRDZW50ZXIgPSB7XG4gICAgICB5OiBuZXdIZWlnaHRSYXRpbyAqIGZvY3VzLmRpc3RhbmNlVG9DZW50ZXIgKyBuZXdCb3VuZGluZ1JlY3QueTFcbiAgICB9O1xuICAgIHZhciBkZWx0YSA9IGV4cGVjdGVkQ2VudGVyLnkgLSBjZW50ZXIueTtcbiAgICBzY3JvbGxUYXJnZXQuc2Nyb2xsVG9wICs9IGRlbHRhO1xuICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPj0gMC41KVxuICAgICAgYWxsb3dVcGRhdGUgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIHNldEFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIGFkZEFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIHJlbW92ZUFuY2hvcigpIHt9XG4gIGZ1bmN0aW9uIGJpbmRBbmNob3IoKSB7fVxuICBmdW5jdGlvbiBhbGxvd1VwZGF0ZSgpIHt9XG5cbiAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gICAgYWN0aXZlID0gdHJ1ZTtcbiAgICB1cGRhdGVGb2N1cygpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgICBhY3RpdmUgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFhY3RpdmUpIHJldHVybjtcbiAgICAgIGlmIChmb2N1cykgcmVzY3JvbGwoKTtcbiAgICB9KTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWFjdGl2ZSkgcmV0dXJuO1xuICAgICAgaWYgKCFhbGxvd1VwZGF0ZSkge1xuICAgICAgICBhbGxvd1VwZGF0ZSA9IHRydWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwZGF0ZUZvY3VzKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdXBkYXRlRm9jdXMoKTtcbiAgfVxuXG4gIGluaXQoKTtcbiAgLy8gcHVibGljIG1ldGhvZHNcbiAgYXBpLnJlc2Nyb2xsID0gcmVzY3JvbGw7XG4gIGFwaS51cGRhdGVGb2N1cyA9IHVwZGF0ZUZvY3VzO1xuICBhcGkuYWN0aXZhdGUgPSBhY3RpdmF0ZTtcbiAgYXBpLmRlYWN0aXZhdGUgPSBkZWFjdGl2YXRlO1xuICAvLyBhcGkuZ2V0QW5jaG9yID0gZ2V0QW5jaG9yO1xuICAvLyBhcGkuc2V0QW5jaG9yID0gc2V0QW5jaG9yO1xuICAvLyBhcGkuYWRkQW5jaG9yID0gYWRkQW5jaG9yO1xuICAvLyBhcGkucmVtb3ZlQW5jaG9yID0gcmVtb3ZlQW5jaG9yO1xuICAvLyBhcGkuYmluZEFuY2hvciA9IGJpbmRBbmNob3I7XG4gIHJldHVybiBhcGk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluaXRSZXNjcm9sbDtcbiJdfQ==
