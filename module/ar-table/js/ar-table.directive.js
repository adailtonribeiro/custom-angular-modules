(function () {
  /**
   * @ngdoc directive
   * @name arTable
   * @author adailtonribeiro <adailton.ribeiro1@gmail.com>
   * @description Table component based on html tag "table".
   * @param {String}
   *          id component ID.
   * @param {Array}
   *          items List of objects to be displayed in the rows of the table.
   * @param {Function}
   *          infinite-scroll-callback Function that performs paged search to the backend and returns a promise object.
   * @param {Function}
   *          selected-item-callback Function which receives the selected item from the table.
   * @param {Function}
   *          save-item-callback Function responsible to save the changes made to the item.
   * @param {String}
   *          message-records-not-found Message to be shown when the search cannot find any register.
   * @param {String}
   *          table-with-multi-selection Boolean attribute that controls the checkbox visibility in the table.          
   * @param {Boolean}
   *          fixed-content Boolean attribute that set if the table has fixed height.
   * @param {String}
   *          fixed-content-height Set the maximum height of the table..
   * @example 
   * <ar-table id="idArTableProducts" 
   *     items="productsList"
   *     infinite-scroll-callback="pagedSearchFunction"
   *     selected-item-callback="selectItemFunction"
   *     save-item-callback="saveFunction"
   *     fixed-content="true" 
   *     message-records-not-found="product.record_not_found">
   *     <ar-table-header> 
   *         <ar-table-column-header>{{'name' | translate}}</ar-table-column-header>
   *     </ar-table-header> 
   *     <ar-table-row popover-page="'pages/product-detail.popup.html'">
   *         <ar-table-column field-rename="name"></ar-table-column>
   *     </ar-table-row> 
   * </ar-table>
   */
  angular.module('arTable').directive('arTable', function ($window, $filter, $parse, $timeout, ArAppUtil) {
    return {
      template: '<div id="arTable">' +
        '<div id="divHeader"></div>' +
        '<div id="divContent"></div>' +
        '<div id="divFooter"></div>' +
        '<div id="divBusy" ng-show="busyArTable" class="padding-left-half">' +
          '<i class="fa fa-spinner fa-spin"></i>' +
        '</div>' +
        '</div>',
      restrict: 'E',
      transclude: true,
      scope: true,
      compile: function compile(tElement, tAttrs, transclude) {
        return {
          pre: function (scope, tableElement, attrs, controller, transcludeFn) {
            scope.items = $parse(attrs.items)(scope);
            scope.selectedItemCallback = scope[attrs.selectedItemCallback];
            scope.saveItemCallback = scope[attrs.saveItemCallback];
            scope.tableWithMultiSelection = attrs.tableWithMultiSelection;
            if (attrs.fixedContentHeight || attrs.fixedContent) {
              scope.fixedContent = true;
              scope.fixedContentHeight = (attrs.fixedContentHeight) ? attrs.fixedContentHeight : 200;
              tableElement.find('#divBusy > i').addClass('position-absolute');
            }
            scope.busyArTable = false;
            scope.offsetArTable = 0;
            scope.finishedScrollArTable = false;
            scope.messageRecordsNotFound = _.isEmpty(attrs.messageRecordsNotFound) ?
              $filter('translate')("error.record_not_found") : $filter('translate')(attrs.messageRecordsNotFound);

            /**
             * Assign the table scope to the parent scope.
             */
            var scopeParent = ArAppUtil.getScopeOwnerProperty(scope, attrs.items);
            if (attrs.id) {
              scopeParent[attrs.id] = scope;
            } else {
              scopeParent.arTable = scope;
            }

            if (scope.tableWithMultiSelection) {
              /**
               * Variable that controls whether the table has selected items.
               */
              scope.hasItemSelectedCheckbox = false;
              scope.headerCheckbox = {};
              scope.headerCheckbox.option = false;

              /**
               * @ngdoc method
               * @memberof arTable
               * @description Function responsible for controlling the click on the checkbox for each item.
               */
              scope.checkSelectionIndividualCheckbox = function (item) {
                item.checkboxVal = !item.checkboxVal;
                scope.hasItemSelectedCheckbox = $filter('filter')(scope.items, {
                  checkboxVal: true
                }, true).length > 0;
                if (!item.checkboxVal) {
                  scope.clearHeaderCheckbox();
                }
              };

              /**
               * @ngdoc method
               * @memberof arTable
               * @description Function responsible for controlling the click on the checkbox from the table header.
               */
              scope.checkSelectionAllCheckbox = function () {
                scope.items.forEach(function (item) {
                  item.checkboxVal = scope.headerCheckbox.option;
                });
                scope.hasItemSelectedCheckbox = !_.isEmpty(scope.items) && scope.headerCheckbox.option;
              };

              /**
               * @ngdoc method
               * @memberof arTable
               * @description Function responsible for unchecking all checkboxes in the table.
               */
              scope.clearCheckboxs = function () {
                scope.headerCheckbox.option = false;
                scope.items.forEach(function (item) {
                  item.checkboxVal = false;
                });
                scope.hasItemSelectedCheckbox = false;
              };

              /**
               * @ngdoc method
               * @memberof arTable
               * @description Function responsible for unchecking the checkbox from the table header. 
               */
              scope.clearHeaderCheckbox = function () {
                scope.headerCheckbox.option = false;
              };

              /**
               * @ngdoc method
               * @memberof arTable
               * @description Function responsible for fetching all items that are selected by checkbox..
               */
              scope.getAllSelectedByCheckbox = function () {
                return tableElement.find('input[type="checkbox"]:not(.opt-allcbx):checked');
              };

              /**
               * @ngdoc method
               * @memberof arTable
               * @description Function responsible for returning a list with the records selected in the table.
               */
              scope.filterItemsSelected = function () {
                var addedList = [];
                var selectedList = scope.getAllSelectedByCheckbox();

                for (var i = 0; i < scope.items.length; i++) {
                  if ($filter('filter')(selectedList, {
                      id: "cbx_" + scope.items[i].$$hashKey.split(":")[1]
                    }, true).length > 0) {
                    addedList.push(scope.items[i]);
                  }
                  if (selectedList.length === addedList.length) {
                    break;
                  }
                }
                return addedList;
              };
            }
            
            /**
             * @ngdoc method
             * @memberof arTable
             * @description Function called by the third-party directive "infinite-scroll" to perform paged query to the backend from the scroll position.
             */
            scope.infiniteScrollCallback = function () {
              if (!_.isUndefined(scope[attrs.infiniteScrollCallback]) && !scope.finishedScrollArTable && !scope.busyArTable) {
                scope.busyArTable = true;
                if (scope.offsetArTable === 0) {
                  initializeAttributes();
                }
                scope[attrs.infiniteScrollCallback](scope.offsetArTable).then(function (response) {
                  if (response.data.resultado.length === 0) {
                    scope.finishedScrollArTable = true;
                  } else {
                    for (var i = 0; i < response.data.resultado.length; i++) {
                      scope.items.push(response.data.resultado[i]);
                    }
                    scope.offsetArTable = scope.offsetArTable + 1;
                    if (response.data.limite && response.data.resultado.length < response.data.limite) {
                      scope.finishedScrollArTable = true;
                    }
                    if (scope.tableWithMultiSelection) {
                      scope.clearHeaderCheckbox();
                    }
                  }
                  scope.busyArTable = false;
                });
              }
            };

            /**
             * @ngdoc method
             * @memberof arTable
             * @description Function responsible for initializing table attributes control.
             */
            function initializeAttributes() {
              if (scope.items)
                scope.items.length = 0;
              scope.offsetArTable = 0;
              scope.finishedScrollArTable = false;
            }

            /**
             * @ngdoc method
             * @memberof arTable
             * @description Function responsible for updating table data.
             */
            scope.refreshTable = function () {
              scope.offsetArTable = 0;
              scope.finishedScrollArTable = false;
              scope.infiniteScrollCallback();
            };

            /**
             * Watch the changes in items and updates the table.
             */
            scope.$watch(attrs.items, function (newValue, oldValue) {
              if (oldValue !== newValue) {
                if (!_.isUndefined(scope[attrs.infiniteScrollCallback])) {
                  scope.refreshTable();
                } else {
                  scope.items = newValue;
                }
              }
            });

            /**
             * Check if the item is selectable.
             */
            if (attrs.selectedItemCallback) {
              scope.isSelectable = true;
            } else {
              scope.isSelectable = false;
            }

            /**
             * Intercept the onRefreshArTable event by performing the action of updating the table.
             */
            tableElement.on("onRefreshArTable", function (event, elementName) {
              scope.refreshTable();
            });

            var items = transcludeFn(scope, function (clone) {
              return clone.children();
            });
            var divHeader = tableElement.find('#divHeader');
            var divFooter = tableElement.find('#divFooter');
            var divConteudo = tableElement.find('#divContent');

            /**
             * @ngdoc method
             * @memberof arTable
             * @description Function responsible for attaching the child component to the table.
             * @param {Element} component Child component to be appended to table.
             */
            function appendChildTable(componentChild) {
              if (angular.element(componentChild).hasClass('table-header')) {
                divHeader.append(componentChild);
              } else if (angular.element(componentChild).hasClass('table-footer')) {
                divFooter.append(componentChild);
              } else if (angular.element(componentChild).hasClass('div-table-body')) {
                divConteudo.append(componentChild);
              }
            }

            items.each(function (index, componentChild) {
              appendChildTable(componentChild);
            });
          }
        };
      },
    };
  });
})();