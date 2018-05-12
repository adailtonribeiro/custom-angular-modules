(function () {
  /**
   * @ngdoc directive
   * @name arCombobox
   * @description Combobox component based on the "select" html tag.
   * @param {String}
   *          ng-model Attribute for binding the component with the data model.
   * @param {Array}
   *          items List of objects to be displayed in the combobox rows.
   * @param {String}
   *          description String containing the attribute (s) of the object that will be used to display the description of the
   *          item in the combobox, if you want to pass more than one attribute must be separated by a comma.
   * @param {Function}
   *          infinite-scroll-callback Function that performs the paged search to the backend and returns an object of type promisse.
   * @param {Function}
   *          selected-item-callback Function called after the item to be selected
   * @param {Function} 
   *          link-callback Function called when the link is triggered.
   *  @param {String}
   *          ng-disabled Variable or expression that returns a Boolean value that indicates whether the combo will be enabled or disabled, if the value returned is true the combo will be
   *          disabled and if false will be enabled.
   * @example
   *    <ar-combobox
   *         ng-model="productVersion.product.id"
   *         items="productList"
   *         description="description"
   *         infinite-scroll-callback="searchProduct"
   *         selected-item-callback="selectProduct"
   *         di-validator="required" 
   *         ng-disabled="hasProject"
   *         link-callback="openLink">
   *     </ar-combobox>
   */
  angular.module('arCombobox').directive('arCombobox', function ($filter, $parse, $compile, $timeout, $document, KeyCodeEvent, DiAppUtil) {
    return {
      template: '<div class="ar-combobox">' +
        '<div id="arComboboxExternalLink" ng-show="showExternalLink" class="external-link"><button ng-disabled="isLinkDisabled"></button></div>' +
        '       <input id="arComboboxInput" type="text" maxlength="512" class="ar-combobox-input form-control" ng-model="searchObject.text" ng-model-options="{ debounce: 400 }" ng-disabled="ngDisabledArCombobox" ng-keydown="keyDownInput($event)">' +
        '       <div id="arComboboxDropdownMenu" class="ar-combobox-dropdown-menu">' +
        '               <table id="arComboboxTable" class="ar-combobox-table table" infinite-scroll-parent="true" infinite-scroll="infiniteScrollCallback()"  infinite-scroll-distance="0">' +
        '                   <tbody ng-show="items.length">' +
        '                       <tr id="tab_{{$index - 1}}" tabindex="{{$index - 1}}" ng-class="{\'item-selected\':(item.selected === true)}" ng-repeat="item in items" ng-click="setSelectedItem(item)" ng-keydown="keyNavigationRow($event, item)">' +
        '                           <td title-nowrap>' +
        '                               <span ng-bind-html="getDescriptionValue(item) | highlight:searchObject.text:selectedItem"></span>' +
        '                           </td>' +
        '                       </tr>' +
        '                   </tbody>' +
        '                   <tfoot ng-show="!items.length && !busyArCombobox">' +
        '                       <tr id="trRegisterNotFound">' +
        '                           <td>{{\'di_combobox.nenhum_registro_encontrado\' | translate}}</td>' +
        '                       </tr>' +
        '                   </tfoot>' +
        '               </table>' +
        '               <div ng-show="busyArCombobox" class="padding-left-half">' +
        '                   <i  class="fa fa-spinner fa-spin"></i>' +
        '               </div>' +
        '       </div>' +
        '       <div class="ar-combobox-buttons">' +
        '           <a ng-show="showButtonClear" id="arComboboxButtonClear" class="ar-combobox-button-clear fa fa-remove"  ng-class="{disabled:ngDisabledArCombobox === true}"></a>' +
        '           <a id="arComboboxButtonToggle" class="ar-combobox-button-toggle fa fa-caret-down"  ng-class="{disabled:ngDisabledArCombobox === true}"></a>' +
        '       </div>' +
        '</div>',
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: true,
      link: function postLink(scope, arCombobox, attrs) {
        scope.fieldsDescription = attrs.description.replace(' ', '').split(',');
        scope.items = scope[attrs.items];
        scope.selectedItemCallback = scope[attrs.selectedItemCallback];
        scope.busyArCombobox = false;
        scope.showExternalLink = !_.isUndefined(attrs.linkCallback);
        scope.isLinkDisabled = true;
        var isComboPaginated = !_.isUndefined(attrs.infiniteScrollCallback);
        var modelParts = attrs.ngModel.split('.');
        var itemKey = modelParts[modelParts.length - 1];
        var offsetArCombobox = 0;
        var arComboboxDropdownMenuHeight = 148;
        var arComboboxRowHeight = 28;
        var arComboboxRowRegisterNotFoundHeight = 35;
        var arComboboxName = 'arCombobox_' + attrs.ngModel;
        var itemsStaticSearch;
        var arComboboxButtonToggle = arCombobox.find('#arComboboxButtonToggle');
        var arComboboxButtonClear = arCombobox.find('#arComboboxButtonClear');
        var arComboboxInput = arCombobox.find('#arComboboxInput');
        var arComboboxDropdownMenu = arCombobox.find('#arComboboxDropdownMenu');
        var arComboboxTable = arCombobox.find('#arComboboxTable');
        var arComboboxExternalLink = arCombobox.find('#arComboboxExternalLink');

        initializeAttributes();

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por isolar o scroll do menu dropdown evitando intereferência no scroll externo.
         */
        function isolatedScroll(event) {
          event.preventDefault();
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável inicializar os atributos da combo.
         */
        function initializeAttributes() {
          calcWidthDropdownMenu(arCombobox);
          arComboboxInput.attr('owner', arComboboxName);
          arComboboxTable.attr('owner', arComboboxName);
          arComboboxButtonToggle.attr('owner', arComboboxName);
          if (attrs.placeholder) {
            arComboboxInput.attr('placeholder', attrs.placeholder);
            arComboboxInput.addClass('better-placeholder');
            $compile(arComboboxInput)(scope);
          }
          arComboboxInput.on('click', onClickInput);
          arComboboxInput.on('keypress', onKeypressInput);
          arComboboxInput.on('focus', onFocusInput);
          arComboboxDropdownMenu.on('blur', onBlurDropdownMenu);
          arComboboxButtonToggle.on('click', onClickButtonToggle);
          arComboboxButtonClear.on('click', onClickButtonClear);
          arComboboxExternalLink.on('click', onClickExternalLink);
          $document.on('click', onClickDocument);
          scope.$watch(attrs.ngModel, onWatchNgModel);
          scope.$watch('searchObject.text', onWatchSearchObjet);
          scope.$watch(attrs.items, onWatchItens);
          scope.$watch(attrs.ngDisabled, onWatchDisabled);
          scope.$watch('selectedItem', onWatchSelectedItem);
          arComboboxDropdownMenu.on('mousewheel DOMMouseScroll', onMouseWhellMenuDropdown);
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por calcular o tamanho do menu dropdown.
         */
        function calcWidthDropdownMenu(arCombobox) {
          var waitForParentPromise = DiAppUtil.wait(function () {
            if (arCombobox.parent().innerWidth() !== 0) {
              DiAppUtil.waitCancel(waitForParentPromise);
              var paddingLeftParent = arCombobox.parent().css('padding-left');
              var paddingRightParent = arCombobox.parent().css('padding-right');
              var paddingHorizontalTotal = parseInt(paddingLeftParent.replace('px', '')) + parseInt(paddingRightParent.replace('px', ''));

              arComboboxDropdownMenu.css('margin-left', paddingLeftParent);
              arComboboxDropdownMenu.css('width', 'calc(100% - ' + paddingHorizontalTotal + 'px)');
            }
          });
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Calcula a altura do menu dropdown.
         * @param {Integer} qtdeItns quantidade de itens.
         */
        function calcHeightDropdownMenu(qtdeItens) {
          var heightDropdownMenu = arComboboxDropdownMenuHeight;
          if (qtdeItens === 0) {
            heightDropdownMenu = arComboboxRowRegisterNotFoundHeight;
            arComboboxDropdownMenu.css('height', heightDropdownMenu + 'px');
            arComboboxDropdownMenu.css('overflow', 'hidden');
          } else {
            if (qtdeItens <= 5) {
              heightDropdownMenu = arComboboxRowHeight * qtdeItens + 10;
            }
            arComboboxDropdownMenu.css('height', heightDropdownMenu + 'px');
            arComboboxDropdownMenu.css('overflow-y', 'auto');
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por atualizar os dados da combobox paginado.
         */
        function refreshComboboxPaginated() {
          var waitForBusyPromise = DiAppUtil.wait(function () {
            if (!scope.busyArCombobox) {
              DiAppUtil.waitCancel(waitForBusyPromise);
              scope.items = [];
              offsetArCombobox = 0;
              scope.infiniteScrollCallback();
            }
          });
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado passar ao rola o mouse dentro do menu dropdown.
         * @param {Event} Evento gerado pela ação.
         */
        function onMouseWhellMenuDropdown(event) {
          var event0 = event.originalEvent,
            delta = event0.wheelDelta || -event0.detail;
          this.scrollTop += (delta < 0 ? 1 : -1) * 30;
          isolatedScroll(event);
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado ao clicar no input do combobox.
         * @param {Event} Evento gerado pela ação.
         */
        function onClickInput(event) {
          if (event.target.id === arComboboxInput.attr('id')) {
            arComboboxDropdownMenu.addClass('open');
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado ao perder o foco no menu drop down.
         * @param {Event} Evento gerado pela ação.
         */
        function onBlurDropdownMenu(event) {
          arComboboxDropdownMenu.removeClass('open');
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado ao clicar no botão de toogle do combobox.
         * @param {Event} Evento gerado pela ação.
         */
        function onClickButtonToggle(event) {
          arComboboxInput.data({
            'focusSettedDynamic': true
          });
          arComboboxInput.focus();
          if (!arComboboxDropdownMenu.hasClass('open')) {
            arComboboxDropdownMenu.addClass('open');
          } else {
            arComboboxDropdownMenu.removeClass('open');
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado ao clicar no botão de limpar do combobox.
         * @param {Event} Evento gerado pela ação.
         */
        function onClickButtonClear(event) {
          arComboboxInput.focus();
          clearCombobox();
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado ao clicar no botão de limpar do combobox.
         * @param {Event} Evento gerado pela ação.
         */
        function onClickExternalLink(event) {
          if (!scope.isLinkDisabled) {
            scope[attrs.linkCallback](scope.selectedItem);
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado ao clicar no documento fora do combobox.
         * @param {Event} Evento gerado pela ação.
         */
        function onClickDocument(event) {
          if ((event.target.id !== 'arComboboxInput' && event.target.id !== 'arComboboxButtonToggle') || event.target.attributes.getNamedItem('owner').value !== arComboboxName) {
            arComboboxDropdownMenu.removeClass('open');
            clearComboboxNotSelectedItem();
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado ao pressionar alguma tecla no input do combobox.
         * @param {Event} Evento gerado pela ação.
         */
        function onKeypressInput(event) {
          if (!arComboboxDropdownMenu.hasClass('open')) {
            if (event.keyCode !== KeyCodeEvent.TAB) {
              arComboboxDropdownMenu.addClass('open');
            }
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado quando o input do combobox recebe focus.
         * @param {Event} Evento gerado pela ação.
         */
        function onFocusInput(event, focusSettedDynamic) {
          if (event.relatedTarget && !arComboboxInput.data('focusSettedDynamic')) {
            arComboboxDropdownMenu.addClass('open');
          }
          arComboboxInput.data({
            'focusSettedDynamic': false
          });
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado quando houver mudança no model.
         * @param {Object} newValue Novo valor após a alteração
         * @param {Object} oldValue Valor antigo após a alteração.
         */
        function onWatchNgModel(newValue, oldValue) {
          var modelName = attrs.ngModel.replace('.' + itemKey, '');
          scope.selectedItem = $parse(modelName)(scope);
          if (!_.isEmpty(scope.selectedItem) && !_.isNull(scope.selectedItem[itemKey]) && !_.isUndefined(scope.selectedItem[itemKey])) {
            scope.searchObject.text = scope.getDescriptionValue(scope.selectedItem);
          } else {
            scope.selectedItem = null;
            scope.searchObject.text = "";
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado quando houver mudança no objeto de pesquisa efetuando uma busca
         * apenas quando o intervalo de tempo de digitação dos caracteres obeça o tempo mínimo de acordo
         * com a propriedade debounce do input.
         * @param {Object} newValue Novo valor após a alteração
         * @param {Object} oldValue Valor antigo após a alteração.
         */
        function onWatchSearchObjet(newValue, oldValue) {
          scope.showButtonClear = !_.isEmpty(scope.searchObject.text);
          if (newValue != oldValue) {
            if (!_.isEmpty(scope.selectedItem) && scope.searchObject.text !== scope.getDescriptionValue(scope.selectedItem)) {
              setSelectedItemEmpty();
              scope.showButtonClear = false;
            }
            searchItemInList();
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado quando houver mudança no atributo que habilita ou desabilita o componente.
         * @param {Object} newValue Novo valor após a alteração
         * @param {Object} oldValue Valor antigo após a alteração.
         */
        function onWatchDisabled(newValue, oldValue) {
          scope.ngDisabledArCombobox = angular.isUndefined(newValue) ? false : newValue;
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado quando houver mudança no atributo que armazena o item selecionado.
         * @param {Object} newValue Novo valor após a alteração
         * @param {Object} oldValue Valor anterir à alteração.
         */
        function onWatchSelectedItem(newValue, oldValue) {
          if (_.isNull(newValue)) {
            scope.isLinkDisabled = true;
          } else {
            scope.isLinkDisabled = false;
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por limpar o combobox quando não tem nenhum item selecionado.
         */
        function clearComboboxNotSelectedItem() {
          var waitForSearchPromise = DiAppUtil.wait(function () {
            if (scope.searchObject.text === arComboboxInput.val()) {
              DiAppUtil.waitCancel(waitForSearchPromise);
              if ((_.isUndefined(scope.selectedItem) || _.isEmpty(scope.selectedItem)) && !_.isEmpty(scope.searchObject.text)) {
                clearCombobox();
              }
            }
          });
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por limpar o combobox.
         */
        function clearCombobox() {
          scope.searchObject.text = "";
          scope.showButtonClear = false;
          scope.$apply();
          arComboboxTable.find('tr').removeClass('item-selected');
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Evento disparado quando houver mudança na lista de itens.
         * @param {Object} newValue Novo valor após a alteração
         * @param {Object} oldValue Valor antigo após a alteração.
         */
        function onWatchItens(newValue, oldValue) {
          if (isComboPaginated) {
            if (oldValue !== newValue) {
              refreshComboboxPaginated();
            }
          } else {
            scope.items = newValue;
            itemsStaticSearch = angular.copy(scope.items);
            selectItemInStaticList();
            if (!_.isUndefined(scope.items)) {
              calcHeightDropdownMenu(scope.items.length);
            }
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por executar a pesquisa na lista.
         */
        function searchItemInList() {
          if (isComboPaginated) {
            refreshComboboxPaginated();
            selectItemInList();
          } else {
            if (_.isEmpty(scope.selectedItem)) {
              searchItemInStaticList();
            } else {
              selectItemInStaticList();
            }
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por executar a pesquisa na lista estática.
         */
        function searchItemInStaticList() {
          if (_.isUndefined(itemsStaticSearch)) {
            itemsStaticSearch = angular.copy(scope.items);
          }
          var itemsSearched = [];
          itemsStaticSearch.forEach(function (item, index) {
            var description = scope.getDescriptionValue(item).toLocaleLowerCase();
            if (description.search(scope.searchObject.text.toLocaleLowerCase()) !== -1) {
              itemsSearched.push(item);
            }
          });
          scope.items = itemsSearched;
          calcHeightDropdownMenu(scope.items.length);
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por selecionar um item na lista estática.
         */
        function selectItemInStaticList() {
          if (!_.isUndefined(scope.items)) {
            scope.items.forEach(function (item, index) {
              var description = scope.getDescriptionValue(item);
              if (description === scope.getDescriptionValue(scope.selectedItem)) {
                item.selected = true;
              } else {
                item.selected = false;
              }
            });
            calcHeightDropdownMenu(scope.items.length);
          }
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por selecionar um item na lista.
         */
        function selectItemInList() {
          if (scope.selectedItem) {
            var itemFound = _.findWhere(scope.items, {
              'id': scope.selectedItem[itemKey]
            });
            if (itemFound) {
              var rowSelected = getRowSelected();
              if (rowSelected.length === 0) {
                itemFound.selected = true;
              }
            }
          }
        }

        /**
         * Objeto de pesquisa do combobox.
         */
        scope.searchObject = {
          text: "",
          selected: false
        };

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function de retorno chamada pela diretiva de terceiros "infinite-scroll" para realizar o controle
         * de consultas ao back-end a partir do posicionamento do scroll.
         */
        scope.infiniteScrollCallback = function () {
          if (!_.isUndefined(scope[attrs.infiniteScrollCallback])) {
            if (!scope.busyArCombobox) {
              scope.busyArCombobox = true;
              if (_.isUndefined(scope.items)) {
                scope.items = [];
              }

              var lastTypedText = "";
              if (!scope.selectedItem) {
                lastTypedText = scope.searchObject.text;
              }
              var promisseReturn = scope[attrs.infiniteScrollCallback](lastTypedText, offsetArCombobox);
              if (!_.isUndefined(promisseReturn)) {
                processPromisseInfiniteScroll(promisseReturn, lastTypedText);
              } else {
                calcHeightDropdownMenu(0);
                scope.busyArCombobox = false;
              }
            }
          }
        };

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por processar o a função promisse contendo a pesquisa ao backend.
         */
        function processPromisseInfiniteScroll(promisseReturn, lastTypedText) {
          promisseReturn.then(function (response) {
            if (response.data.resultado.length === 0) {
              calcHeightDropdownMenu(scope.items.length);
            } else {
              for (var i = 0; i < response.data.resultado.length; i++) {
                scope.items.push(response.data.resultado[i]);
              }
              offsetArCombobox = offsetArCombobox + 1;
              selectItemInList();
              calcHeightDropdownMenu(scope.items.length);
            }
            scope.busyArCombobox = false;
            arCombobox.trigger('onPopulateItens', [scope.items, lastTypedText]);
          });
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por setar o item selecionado no atributo do escopo
         * referenciado no ng-model
         * @param {Object} Item selecionado da lista.
         */
        scope.setSelectedItem = function (item) {
          var model = $parse(attrs.ngModel.replace('.' + itemKey, ''));
          model.assign(scope, item);
          if (scope.selectedItemCallback) {
            scope.selectedItemCallback(item);
          }
          arComboboxDropdownMenu.removeClass('open');
          arComboboxInput.data({
            'focusSettedDynamic': true
          });
          arComboboxInput.focus();
          if (!isComboPaginated) {
            scope.items = angular.copy(itemsStaticSearch);
          } else if(scope.searchObject.text === scope.getDescriptionValue(item)){
            searchItemInList();
          }
        };

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Executado quando o usuário acionar a tecla de keydown quando o foco estiver no input.
         * @param {Event} Evento gerado pela ação de keyDown do input.
         */
        scope.keyDownInput = function (event) {
          switch (event.keyCode) {
          case KeyCodeEvent.TAB:
            clearComboboxNotSelectedItem();
            arComboboxDropdownMenu.removeClass('open');
            break;
          case KeyCodeEvent.DOWN:
            isolatedScroll(event);
            arComboboxDropdownMenu.addClass('open');
            var rowSelected = getRowSelected();
            if (rowSelected.length !== 0) {
              rowSelected.removeClass('item-selected');
            }
            var tbody = arComboboxTable.children()[0];
            var rowFirst = angular.element(tbody.children[0]);
            rowFirst.focus();
            rowFirst.addClass('item-selected');
            $timeout(function () {
              arComboboxDropdownMenu.scrollTop(0, 0);
            });
            break;
          }
        };

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Retorna a linha da tabela que está selecionada.
         */
        function getRowSelected() {
          return arComboboxTable.find('tr.item-selected');
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Responsável por navegar na linha usandos as teclas para baixo e para cima.
         * @param {Event} Evento gerado pela ação de keyDown do linha.
         */
        scope.keyNavigationRow = function (event, item) {
          var target = event.target;
          var scrollPosition;

          switch (event.keyCode) {
          case KeyCodeEvent.TAB:
            clearComboboxNotSelectedItem();
            arComboboxDropdownMenu.removeClass('open');
            arComboboxInput.data({
              'focusSettedDynamic': true
            });
            arComboboxInput.focus();
            break;
          case KeyCodeEvent.ENTER:
            event.preventDefault();
            event.stopPropagation();
            scope.setSelectedItem(item);
            break;
          case KeyCodeEvent.DOWN:
            isolatedScroll(event);
            if (target.nextElementSibling) {
              var nextElementSibling = angular.element(target.nextElementSibling);
              nextElementSibling.focus();
              nextElementSibling.addClass('item-selected');
              angular.element(target).removeClass('item-selected');
              scrollPosition = parseInt(nextElementSibling.attr('tabindex')) * arComboboxRowHeight;
            }
            break;
          case KeyCodeEvent.UP:
            isolatedScroll(event);
            if (target.previousElementSibling) {
              var previousElementSibling = angular.element(target.previousElementSibling);
              previousElementSibling.focus();
              previousElementSibling.addClass('item-selected');
              angular.element(target).removeClass('item-selected');
              scrollPosition = parseInt(previousElementSibling.attr('tabindex')) * arComboboxRowHeight;
            }
            break;
          default:
            if (!_.isEmpty(scope.selectedItem)) {
              setSelectedItemEmpty();
            }
            arComboboxInput.focus();
          }

          if (!_.isUndefined(scrollPosition)) {
            arComboboxDropdownMenu.scrollTop(scrollPosition - arComboboxRowHeight);
          }
        };
        
        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por setar como nulo o item referenciado no ng-model.
         */
        function setSelectedItemEmpty(){
          scope.setSelectedItem(null);
        }

        /**
         * @ngdoc method
         * @memberof arCombobox
         * @description Function responsável por retorna a descrição do item
         * @param {Object} Objeto item a ser retornado a descrição.
         */
        scope.getDescriptionValue = function (item) {
          var text = DiAppUtil.getDescriptionValue(item, scope.fieldsDescription);

          if (text.startsWith('enum')) {
            text = $filter('translateEnum')(text);
          }
          return text;
        };
      }
    };
  });
})();