var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(8000);
console.log('visit localhost:8000/examples to see examples');
