#### Rescroll

A tiny module to fix resize problem on responsive webpages.
See [Demo](https://marani.github.io/rescroll)

#### Install

With bower
```
bower install rescroll
```
Include `dist/rescroll.js` in your page.


With browserify
```
npm install rescroll
```

#### API Docs

Rescroll exposes a global function `InitRescroll` which accepts the follow parameters:
- `resizeTarget`: element whose resize event will cause changes or reflow to other elements, default is `window`
- `scrollTarget`: element to be scrolled back, default is `document.body`
- `anchors`: anchors to be used as anchor to fix viewport's position on, default is `null`. When initialized, on each resize event on `resizeTarget`, the processor will find the anchor closest to `focusCenterY * <viewport height>` and try to scroll back to the right positoin based on the ratio of height change of that anchor.
- `focusCenterY`: expected user's reading position, default is `0.5`, which is half of viewport's height.

`anchors` is an array of objects of following type
```
  {
    element: [HTMLElement],
    type: ['Box'|'Text']
  }
```

**Example**

To fix viewport on any `p` element closest to the middle of viewport, do the following:
```
var anchors = [];
var boxes = document.querySelectorAll('p');
for (var i = 0; i < boxes.length; i++)
  anchors.push({
    element: boxes[i],
    type: 'Box'
  });
InitRescroll({
  anchors: anchors
});
```
