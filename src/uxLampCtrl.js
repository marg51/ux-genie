(function () {
    'use strict';

  var uxGenie = angular.module('uxGenie');

  uxGenie.controller('uxLampCtrl', function ($scope) {

      $scope.findFirstChild = function (el, className) {
        var container = null;
        if (el.hasClass(className)) {
          container = el;
        } else {
          var children = el.children();
          for (var i = 0; i < children.length; i++) {
            container = $scope.findFirstChild(angular.element(children[i]), className);
            if (container) {
              break;
            }
          }
        }
        return container;
      }

      $scope.localStorage = localStorage;

      $scope.saveToLocalStorage = function (key, words) {
        if (key && $scope.localStorage) {
          var json = JSON.stringify(words);
          $scope.localStorage.setItem(key, json);
        }
      }

      $scope.saveToFirebase = function (ref, words) {
        if (ref) {
          ref.set(words);
        }
      }

      $scope.saveGenie = function () {
        var words = genie.options().enteredMagicWords;
        $scope.saveToLocalStorage($scope.localStorage, words);
        $scope.saveToFirebase($scope.firebaseRef, words);
      }

      /*
       * Helpers
       */
      $scope.safeApply = function (fn) {
        var phase = $scope.$root.$$phase;
        if(phase == '$apply' || phase == '$digest') {
          $scope.$eval(fn);
        }
        else {
          $scope.$apply(fn);
        }
      }

      /*
       * @todo refactor, poor readability
       */
      $scope.toggleVisibility = function (state) {
        $scope.safeApply(function() {
          if (typeof state === 'boolean') {
            $scope.lampVisible = !state;
          }
          $scope.lampVisible = !$scope.lampVisible;
        });
      }
      $scope.getElementOuterHeight = function (element, includeMargin) {
        var cs = document.defaultView.getComputedStyle(element, '');

        var height = parseInt(cs.getPropertyValue('height'));
        var mTop = includeMargin ? parseInt(cs.getPropertyValue('margin-top')) : 0;
        var mBottom = includeMargin ? parseInt(cs.getPropertyValue('margin-bottom')) : 0;
        return height + mTop + mBottom;
      }

      $scope.scrollToWish = function (index) {
        var containerEl = $scope.lampWishesContainer[0];
        var containerHeight = $scope.getElementOuterHeight(containerEl);
        var focusedWishElement = $scope.lampWishesContainer.children()[index];
        var containerTop = containerEl.scrollTop;
        var containerBottom = containerTop + containerHeight;
        var focusedWishTop = 0;
        var wishElements = $scope.lampWishesContainer.children();
        for (var i = 0; i < wishElements.length; i++) {
          if (i >= index) break;
          focusedWishTop += $scope.getElementOuterHeight(wishElements[i], true);
        }
        var focusedWishBottom = focusedWishTop + $scope.getElementOuterHeight(focusedWishElement, true);
        if (containerBottom < focusedWishBottom) {
          containerEl.scrollTop = focusedWishBottom - containerHeight;
        } else if (containerTop > focusedWishTop) {
          containerEl.scrollTop = focusedWishTop;
        }
      }

          /*
       * Input events
       */
      $scope.changeSelection = function (change, event) {
        var wishes = $scope.uxLamp.matchingWishes;
        if (wishes && change) {
          if (event) {
            event.preventDefault();
          }
          var index = wishes.indexOf($scope.uxLamp.focusedWish);
          var newIndex = index + change;
          var totalWishes = wishes.length;
          if (newIndex < 0) {
            newIndex = newIndex + totalWishes;
          } else if (newIndex >= totalWishes) {
            newIndex = newIndex - totalWishes;
          }
          $scope.safeApply(function() {
            $scope.uxLamp.focusOnWish(wishes[newIndex], true);
          });
        }
      }

      $scope._setSubContextState = function (wish) {
        if ($scope.uxLamp.state !== $scope.states.subContext) {
          $scope.uxLamp.state = $scope.states.subContext;
          $scope.startTextForSubContext = wish.magicWords[0] + ' ';
          if (wish.data && wish.data.uxGenie && wish.data.uxGenie.displayText) {
            $scope.startTextForSubContext = wish.data.uxGenie.displayText;
          }
          preSubContextContext = genie.context();
          genie.context(wish.data.uxGenie.subContext);
          $scope.safeApply(function() {
            $scope.uxLamp.input = $scope.startTextForSubContext;
          });
        }
      }

      $scope._exitSubContext = function () {
        genie.context(preSubContextContext);
        $scope.uxLamp.state = $scope.states.userEntry;
        $scope.startTextForSubContext = null;
        preSubContextContext = null;
      }

      /*
       * Updating list of wishes
       */
      $scope.updateMatchingWishes = function (magicWord) {
        if (magicWord) {
          if (magicWord.indexOf('\'') === 0) {
            magicWord = magicWord.substring(1);
          }
          $scope.uxLamp.matchingWishes = genie.getMatchingWishes(magicWord);
          if ($scope.uxLamp.matchingWishes.length > 0) {
            $scope.uxLamp.focusedWish = $scope.uxLamp.matchingWishes[0];
          } else {
            $scope.uxLamp.focusedWish = null;
          }
        } else {
          $scope.uxLamp.matchingWishes = null;
          $scope.uxLamp.focusedWish = null;
        }
      }

      $scope.handleInputChange = function (newVal) {
        if ($scope.uxLamp.state === $scope.states.subContext) {
          if (newVal.indexOf($scope.startTextForSubContext.trim()) === 0) {
            newVal = newVal.substring($scope.startTextForSubContext.length);
          } else {
            $scope._exitSubContext();
          }
        }
        $scope.updateMatchingWishes(newVal);
        var firstWish = null;
        var firstWishDisplay = null;
        if ($scope.uxLamp.matchingWishes && $scope.uxLamp.matchingWishes.length > 0) {
          firstWish = $scope.uxLamp.matchingWishes[0];
          firstWishDisplay = firstWish.magicWords[0];
          if (firstWish.data && firstWish.data.uxGenie && firstWish.data.uxGenie.displayText) {
            firstWishDisplay = firstWish.data.uxGenie.displayText;
          }
        }

        if (firstWish && $scope.uxLamp.matchingWishes.length === 1 &&
          $scope._isSubContextWish(firstWish) && firstWishDisplay === newVal) {
          $scope._setSubContextState(firstWish);
        }

        var result = $scope._evaluateMath(newVal || '');
        if (angular.isNumber(result)) {
          $scope.uxLamp.matchingWishes = $scope.uxLamp.matchingWishes || [];
          $scope.uxLamp.matchingWishes.unshift({
            id: mathResultId,
            data: {
              uxGenie: {
                displayText: newVal + ' = ' + result
              }
            }
          });
          $scope.uxLamp.focusedWish = $scope.uxLamp.matchingWishes[0];
        }
      }

      $scope._isSubContextWish = function (wish) {
        return !!wish && !!wish.data && !!wish.data.uxGenie && !!wish.data.uxGenie.subContext;
      }

      $scope._evaluateMath = function (expression) {
        var mathRegex = /(?:[a-z$_][a-z0-9$_]*)|(?:[;={}\[\]"'!&<>^\\?:])/ig;
        var valid = true;

        expression = expression.replace(mathRegex, function(match) {
          if (Math.hasOwnProperty(match)) {
            return 'Math.' + match;
          } else {
            valid = false;
          }
        });

        if (!valid) {
          return false;
        } else {
          try {
            return eval(expression);
          } catch (e) {
            return false;
          }
        }
      }
  });
})();
