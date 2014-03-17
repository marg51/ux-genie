(function () {
    'use strict';

    var uxGenie = angular.module('uxGenie');

    uxGenie.directive('uxLamp', ['genie', '$timeout', '$document', function(genie, $timeout, $document) {
        var states = {
          userEntry: 'userentry',
          subContext: 'subcontext'
        };
        return {
          replace: true,
          transclude: true,
          template: function (el, attr) {
            var ngShow = !attr.rubClass ? ' ng-show="lampVisible"' : '';
            var template = '<div class="genie-lamp-container"' + ngShow + ' ng-transclude></div>';
            if (!attr.uxLamp) {
              template = ['<div class="genie-lamp-container"' + ngShow + '>',
                '<input type="text" ng-model="uxLamp.input" class="lamp-input input form-control" />',
                '<div ng-show="uxLamp.matchingWishes.length > 0" class="lamp-wishes-container">',
                  '<div class="lamp-wish wish-{{wish.id}}" ' +
                    'ng-repeat="wish in uxLamp.matchingWishes" ' +
                    'ng-class="{focused: uxLamp.focusedWish == wish}" ' +
                    'ng-click="uxLamp.makeWish(wish)" ' +
                    'ng-mouseenter="uxLamp.focusOnWish(wish, false)">',
                      '<span class="wish-icon" ng-class="{\'has-img\': wish.data.uxGenie.imgIcon, \'has-i\': wish.data.uxGenie.iIcon}">',
                        '<img class="wish-img-icon" ng-if="wish.data.uxGenie.imgIcon" ng-src="{{wish.data.uxGenie.imgIcon}}">',
                        '<i class="wish-i-icon {{wish.data.uxGenie.iIcon}}" ng-if="wish.data.uxGenie.iIcon"></i>',
                      '</span>',
                      '<span class="wish-display-text">{{wish.data.uxGenie.displayText || wish.magicWords[0]}}</span>',
                    '</div>',
                  '</div>',
                '</div>'].join('');
            }
            return template;
          },
          scope: {
            uxLamp: '=?',
            lampVisible: '=?',
            rubClass: '@',
            rubShortcut: '@',
            rubModifier: '@',
            rubEventType: '@',
            wishCallback: '&?',
            localStorage: '@',
            firebase: '@'
          },
          controller: 'uxLampCtrl',
          link: function(scope, el) {
            scope.states = states;
            scope.uxLamp = scope.uxLamp || {};
            scope.uxLamp.input = '';
            scope.uxLamp.state = scope.states.userEntry;
            scope.lampVisible = false;
            scope.startTextForSubContext = null;
            scope.lampWishesContainer = scope.findFirstChild(el, 'lamp-wishes-container');


            var mathResultId = 'ux-genie-math-result';
            var preSubContextContext = null;

            

            var inputEl = scope.findFirstChild(el, 'lamp-input');
            

            var rubShortcut = scope.rubShortcut || '32';
            var rubModifier = scope.rubModifier || 'ctrlKey';

            rubShortcut = parseInt(rubShortcut, 10);
            if (isNaN(rubShortcut)) {
              rubShortcut = rubShortcut[0].charCodeAt(0);
            }


            /*
             * Setup persistance
             */
            if (scope.firebase && scope.localStorage) {
              throw new Error('ux-lamp cannot have both firebase and local-storage attributes. Choose one or the other.');
            }

            scope.firebaseRef = null;
            if (scope.firebase) {
              if  (typeof Firebase === 'function') {
                scope.firebaseRef = new Firebase(scope.firebase);
              } else {
                throw new Error('ux-lamp cannot use the given firebase url without the "Firebase" global variable.');
              }
            }

            

            if (scope.firebaseRef) {
              scope.firebaseRef.on('value', function(snapshot) {
                genie.options({
                  enteredMagicWords: snapshot.val()
                });
              });
            } else if (scope.localStorage && localStorage) {
              genie.options({
                enteredMagicWords: JSON.parse(localStorage.getItem(scope.localStorage))
              });
            }

            /*
             * Wish focus
             */
            scope.uxLamp.focusOnWish = function(wishElement, autoScroll) {
              scope.uxLamp.focusedWish = wishElement;
              if (scope.uxLamp.focusedWish && autoScroll) {
                scope.scrollToWish(scope.uxLamp.matchingWishes.indexOf(wishElement));
              }
            };

            /*
             * Making a wish
             */
            scope.uxLamp.makeWish = function(wish) {
              var makeWish = true;
              var magicWord = scope.uxLamp.input;
              if (magicWord.indexOf('\'') === 0) {
                magicWord = magicWord.substring(1);
              }
              if (scope.uxLamp.state === scope.states.subContext) {
                magicWord = magicWord.substring(scope.startTextForSubContext.length);
              }
              var makeInvisible = true;
              if (wish.id === mathResultId) {
                makeWish = false;
              }

              if (scope._isSubContextWish(wish)) {
                // Make the wish before the context changes.
                genie.makeWish(wish, magicWord);
                scope.saveGenie();
                scope._setSubContextState(wish);
                makeInvisible = false;
                makeWish = false;
              }

              if (makeWish) {
                wish = genie.makeWish(wish, magicWord);
                scope.saveGenie();
              }
  
              scope.wishCallback({
                wish: wish,
                magicWord: magicWord
              });
              if (makeInvisible) {
                scope.toggleVisibility(false);
              }
            };


            /*
             * Document events
             */
            $document.bind('click', function(event) {
              // If it's not part of the lamp, then make the lamp invisible.
              var clickedElement = event.srcElement || event.target;
              if (clickedElement === el[0]) {
                return;
              }
              var children = el.children();
              for (var i = 0; i < children.length; i++) {
                if (clickedElement === children[i]) {
                  return;
                }
              }
              if (scope.lampVisible) {
                scope.toggleVisibility(false);
              }
            });

            $document.bind(scope.rubEventType || 'keydown', function(event) {
              if (event.keyCode === rubShortcut) {
                if (rubModifier) {
                  if (event[rubModifier]) {
                    event.preventDefault();
                    scope.toggleVisibility();
                  }
                } else {
                  event.preventDefault();
                  scope.toggleVisibility();
                }
              }
            });

            $document.bind('keydown', function(event) {
              if (event.keyCode === 27 && scope.lampVisible) {
                event.preventDefault();
                scope.toggleVisibility(false);
              }
            });

            
            
            inputEl.bind('keydown', (function() {
              return function keydownHandler(event) {
                var change = 0;
                switch(event.keyCode) {
                  case 9:
                    event.preventDefault();
                    var focusedWish = scope.uxLamp.focusedWish;
                    if (scope._isSubContextWish(focusedWish)) {
                      scope._setSubContextState(focusedWish);
                    }
                    break;
                  case 38:
                    change = -1;
                    break;
                  case 40:
                    change = 1;
                    break;
                }
                if (event.shiftKey) {
                  change *= 5;
                }
                scope.changeSelection(change, event);
              }
            })());

            

            el.bind('keyup', function(event) {
              if (event.keyCode === 13 && scope.uxLamp.focusedWish) {
                scope.uxLamp.makeWish(scope.uxLamp.focusedWish);
              }
            });

            

            scope.$watch('lampVisible', function(lampIsVisible) {
              if (lampIsVisible) {
                scope.handleInputChange(scope.uxLamp.input);
                if (scope.rubClass) {
                  el.addClass(scope.rubClass);
                  // Needs to be lampVisible before it can be selected
                  $timeout(function() {
                    inputEl[0].select();
                  }, 25);
                } else {
                  inputEl[0].select();
                }
              } else {
                if (scope.rubClass) {
                  el.removeClass(scope.rubClass);
                }
                inputEl[0].blur();
              }
            });

            

            scope.$watch('uxLamp.input', scope.handleInputChange);
          }
        }
      }]);
})();