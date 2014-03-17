(function () {
    'use strict';

  var uxGenie = angular.module('uxGenie');

  uxGenie.directive('genieWish', ['genie', function(genie) {
      return {
        scope: true,
        link: function(scope, el, attrs) {
          var id = attrs.wishId;
          var context = attrs.wishContext ? attrs.wishContext.split(',') : null;
          var data = attrs.wishData || {};
          var uxGenieData = data.uxGenie = data.uxGenie || {};

          uxGenieData.element = el[0];
          uxGenieData.event = attrs.wishEvent || uxGenieData.event || 'click';
          uxGenieData.iIcon = attrs.wishIIcon;
          uxGenieData.imgIcon = attrs.wishImgIcon;

          var action = function(wish) {
            var modifiers = [];
            if (attrs.eventModifiers) {
              modifiers = attrs.eventModifiers.split(',');
            }
            var event = new MouseEvent(wish.data.uxGenie.event, {
              view: window,
              bubbles: true,
              cancelable: true,
              ctrlKey: modifiers.indexOf('ctrlKey') > -1,
              altKey: modifiers.indexOf('altKey') > -1,
              shiftKey: modifiers.indexOf('shiftKey') > -1,
              metaKey: modifiers.indexOf('metaKey') > -1
            });
            wish.data.uxGenie.element.dispatchEvent(event);
          };

          // get magic words
          var magicWords = null;
          ['genieWish', 'name', 'id'].every(function(attrName) {
            magicWords = attrs[attrName];
            return !magicWords;
          });
          magicWords = magicWords || el.text();
          magicWords = magicWords.replace(/\\,/g, '{{COMMA}}');
          if (magicWords) {
            magicWords = magicWords.split(',');
          } else {
            throw new Error('Thrown by the genie-wish directive: All genie-wish elements must have a magic-words, id, or name attribute.');
          }
          for (var i = 0; i < magicWords.length; i++) {
            magicWords[i] = magicWords[i].replace(/\{\{COMMA\}\}/g, ',');
          }

          var wishRegistered = false;
          attrs.$observe('ignoreWish', function(newVal) {
            if (newVal !== 'true' && !wishRegistered) {
              genie({
                id: id,
                magicWords: magicWords,
                context: context,
                action: action,
                data: data
              });
              wishRegistered = true;
            }
          });
        }
      }
    }]);
})();
