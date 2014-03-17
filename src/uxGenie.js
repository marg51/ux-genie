/**
 * uxGenie.js @license
 * (c) 2013 Kent C. Dodds
 * uxGenie.js may be freely distributed under the MIT license.
 * http://www.github.com/kentcdodds/ux-genie
 * See README.md
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./genie'], factory);
  } else {
    root.uxGenie = factory(genie);
  }
}(this, function(genie) {

  var uxGenie = angular.module('uxGenie', []);

  uxGenie.constant('genie', genie);

}));
