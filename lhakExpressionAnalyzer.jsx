(function (thisObj) {
  /************************************************************
   * CONSTANTS AND CONFIGURATION
   ************************************************************/
  var CONFIG = {
    META: {
      SCRIPT_NAME: 'Expression Usage Analyzer',
      VERSION: 'v0.0.2',
      DESCRIPTION:
        'Analyzes and displays all expressions used in the active project with hierarchical navigation',
    },

    UI: {
      WINDOW: {
        WIDTH: 500,
        HEIGHT: 700,
        MARGINS: 15,
        SPACING: 8,
      },
      PANEL: {
        MARGINS: 10,
        SPACING: 6,
      },
      BUTTON: {
        GOTO: 'Go to Property',
        REFRESH: 'Refresh',
      },
      LABEL: {
        COMPOSITIONS: 'Compositions with Expressions:',
        LAYERS: 'Layers with Expressions:',
        PROPERTIES: 'Properties with Expressions:',
        NO_EXPRESSIONS: 'No expressions found in project',
        NO_COMP_SELECTED: 'Select a composition to see layers',
        NO_LAYER_SELECTED: 'Select a layer to see properties',
      },
      SEARCH: {
        PLACEHOLDER: 'Search expressions (e.g., "wiggle", "time", "random")...',
        CLEAR: 'Clear',
      },
      LISTBOX: {
        COMPOSITIONS_HEIGHT: 150,
        LAYERS_HEIGHT: 150,
        PROPERTIES_HEIGHT: 200,
      },
      COMPOSITIONS_TABLE: {
        COLUMN_WIDTHS: [350, 80], // Composition, Count
        COLUMN_TITLES: ['Composition', 'Count'],
      },
      LAYERS_TABLE: {
        COLUMN_WIDTHS: [350, 80], // Layer, Count
        COLUMN_TITLES: ['Layer', 'Count'],
      },
      PROPERTIES_TABLE: {
        COLUMN_WIDTHS: [200, 400], // Property, Expression
        COLUMN_TITLES: ['Property', 'Expression'],
      },
    },

    ALERT: {
      SUCCESS: 'Project scan completed successfully',
      ERROR_GENERIC: 'An error occurred: ',
      NO_PROJECT: 'Please open a project first',
      NO_COMPOSITION: 'No compositions found in project',
      NO_COMP_SELECTED: 'Please select a composition first',
      NO_LAYER_SELECTED: 'Please select a layer first',
      NO_PROPERTY_SELECTED: 'Please select a property first',
      LAYER_NOT_FOUND: 'Layer could not be found or accessed',
    },
  };

  /************************************************************
   * GLOBAL VARIABLES
   ************************************************************/
  var ui = null;
  var expressionData = {};
  var currentProject = null;
  var allExpressions = []; // For search functionality

  /************************************************************
   * INITIALIZATION
   ************************************************************/
  function init() {
    if (!validateProjectState()) {
      return;
    }

    ui = createUI(thisObj);
    buildUI();
    bindEvents();

    // Perform initial scan before showing UI
    scanProject();
    showUI();
  }

  /************************************************************
   * UI CREATION FUNCTIONS
   ************************************************************/

  /**
   * Creates the main UI window/panel
   * @param {Object} thisObj - ExtendScript 'this' object
   * @returns {Object} UI object with all control references
   */
  function createUI(thisObj) {
    var win;

    if (thisObj instanceof Panel) {
      win = thisObj;
    } else {
      win = new Window('palette', CONFIG.META.SCRIPT_NAME);
      win.orientation = 'column';
      win.alignChildren = ['fill', 'top'];
      win.spacing = CONFIG.UI.WINDOW.SPACING;
      win.margins = CONFIG.UI.WINDOW.MARGINS;
      win.preferredSize.width = CONFIG.UI.WINDOW.WIDTH;
      win.preferredSize.height = CONFIG.UI.WINDOW.HEIGHT;
    }

    return {
      window: win,
      // UI elements will be added during buildUI
    };
  }

  /**
   * Builds the complete user interface
   */
  function buildUI() {
    ui.window.orientation = 'column';
    ui.window.alignChildren = ['fill', 'top'];
    ui.window.spacing = CONFIG.UI.WINDOW.SPACING;

    buildSearchPanel();
    buildCompositionsPanel();
    buildLayersPanel();
    buildPropertiesPanel();
    buildControlButtons();

    ui.title = ui.window.add('statictext', undefined, CONFIG.META.VERSION);
    ui.title.alignment = ['center', 'top'];

    ui.window.layout.layout(true);
  }

  /**
   * Builds the search panel
   */
  function buildSearchPanel() {
    var searchGrp = ui.window.add('group');
    searchGrp.orientation = 'row';
    searchGrp.alignment = 'fill';
    searchGrp.spacing = CONFIG.UI.PANEL.SPACING;

    ui.searchBox = searchGrp.add('edittext', undefined, '');
    ui.searchBox.helpTip = CONFIG.UI.SEARCH.PLACEHOLDER;
    ui.searchBox.alignment = ['fill', 'center'];

    ui.clearSearchBtn = searchGrp.add(
      'button',
      undefined,
      CONFIG.UI.SEARCH.CLEAR
    );
    ui.clearSearchBtn.alignment = ['right', 'center'];
  }

  /**
   * Builds the compositions panel
   */
  function buildCompositionsPanel() {
    var compPnl = ui.window.add(
      'panel',
      undefined,
      CONFIG.UI.LABEL.COMPOSITIONS
    );
    compPnl.orientation = 'column';
    compPnl.alignChildren = ['fill', 'top'];
    compPnl.margins = CONFIG.UI.PANEL.MARGINS;
    compPnl.spacing = CONFIG.UI.PANEL.SPACING;

    ui.compositionsListBox = compPnl.add('listbox', undefined, undefined, {
      name: 'compositionsTable',
      multiselect: false,
      numberOfColumns: 2,
      columnWidths: CONFIG.UI.COMPOSITIONS_TABLE.COLUMN_WIDTHS,
      columnTitles: CONFIG.UI.COMPOSITIONS_TABLE.COLUMN_TITLES,
      showHeaders: true,
    });
    ui.compositionsListBox.preferredSize.height =
      CONFIG.UI.LISTBOX.COMPOSITIONS_HEIGHT;
  }

  /**
   * Builds the layers panel
   */
  function buildLayersPanel() {
    var layersPnl = ui.window.add('panel', undefined, CONFIG.UI.LABEL.LAYERS);
    layersPnl.orientation = 'column';
    layersPnl.alignChildren = ['fill', 'top'];
    layersPnl.margins = CONFIG.UI.PANEL.MARGINS;
    layersPnl.spacing = CONFIG.UI.PANEL.SPACING;

    ui.layersListBox = layersPnl.add('listbox', undefined, undefined, {
      name: 'layersTable',
      multiselect: false,
      numberOfColumns: 2,
      columnWidths: CONFIG.UI.LAYERS_TABLE.COLUMN_WIDTHS,
      columnTitles: CONFIG.UI.LAYERS_TABLE.COLUMN_TITLES,
      showHeaders: true,
    });
    ui.layersListBox.preferredSize.height = CONFIG.UI.LISTBOX.LAYERS_HEIGHT;
  }

  /**
   * Builds the properties panel
   */
  function buildPropertiesPanel() {
    var propPnl = ui.window.add('panel', undefined, CONFIG.UI.LABEL.PROPERTIES);
    propPnl.orientation = 'column';
    propPnl.alignChildren = ['fill', 'top'];
    propPnl.margins = CONFIG.UI.PANEL.MARGINS;
    propPnl.spacing = CONFIG.UI.PANEL.SPACING;

    ui.propertiesListBox = propPnl.add('listbox', undefined, undefined, {
      name: 'propertiesTable',
      multiselect: false,
      numberOfColumns: 2,
      columnWidths: CONFIG.UI.PROPERTIES_TABLE.COLUMN_WIDTHS,
      columnTitles: CONFIG.UI.PROPERTIES_TABLE.COLUMN_TITLES,
      showHeaders: true,
    });
    ui.propertiesListBox.preferredSize.height =
      CONFIG.UI.LISTBOX.PROPERTIES_HEIGHT;
  }

  /**
   * Builds the control buttons
   */
  function buildControlButtons() {
    var btnGrp = ui.window.add('group');
    btnGrp.alignment = 'fill';
    btnGrp.spacing = CONFIG.UI.PANEL.SPACING;

    ui.gotoBtn = btnGrp.add('button', undefined, CONFIG.UI.BUTTON.GOTO);
    ui.gotoBtn.enabled = false;

    ui.refreshBtn = btnGrp.add('button', undefined, CONFIG.UI.BUTTON.REFRESH);
  }

  /**
   * Shows the UI window
   */
  function showUI() {
    if (ui.window instanceof Window) {
      ui.window.center();
      ui.window.show();
    } else {
      ui.window.layout.layout(true);
    }
  }

  /************************************************************
   * EVENT HANDLER FUNCTIONS
   ************************************************************/

  /**
   * Binds all event handlers to UI elements
   */
  function bindEvents() {
    ui.compositionsListBox.onChange = handleCompositionSelection;
    ui.layersListBox.onChange = handleLayerSelection;
    ui.propertiesListBox.onChange = handlePropertySelection;
    ui.gotoBtn.onClick = handleGotoProperty;
    ui.refreshBtn.onClick = handleRefresh;

    // Search event handlers
    ui.searchBox.onChanging = handleSearch;
    ui.clearSearchBtn.onClick = handleClearSearch;
  }

  /**
   * Handles search functionality
   */
  function handleSearch() {
    var searchTerm = ui.searchBox.text.toLowerCase();

    if (searchTerm === '') {
      // Show all compositions when search is empty
      populateCompositionsList();
      clearLayersList();
      clearPropertiesList();
      return;
    }

    // Filter compositions that have expressions matching the search term
    var filteredComps = {};

    for (var compName in expressionData) {
      if (expressionData.hasOwnProperty(compName)) {
        var compData = expressionData[compName];
        var matchingExpressionsCount = 0;

        // Check all expressions in this composition
        for (var layerName in compData.layers) {
          if (compData.layers.hasOwnProperty(layerName)) {
            var layerData = compData.layers[layerName];

            for (var i = 0; i < layerData.properties.length; i++) {
              var propData = layerData.properties[i];
              if (
                propData.expression.toLowerCase().indexOf(searchTerm) !== -1
              ) {
                matchingExpressionsCount++;
              }
            }
          }
        }

        if (matchingExpressionsCount > 0) {
          filteredComps[compName] = {
            comp: compData.comp,
            totalCount: matchingExpressionsCount,
            layers: compData.layers,
          };
        }
      }
    }

    // Populate compositions list with filtered results
    populateFilteredCompositionsList(filteredComps, searchTerm);
    clearLayersList();
    clearPropertiesList();
  }

  /**
   * Populates compositions list with search results
   * @param {Object} filteredComps - Filtered compositions data
   * @param {string} searchTerm - The search term used for filtering
   */
  function populateFilteredCompositionsList(filteredComps, searchTerm) {
    ui.compositionsListBox.removeAll();

    var compsArray = [];
    for (var compName in filteredComps) {
      if (filteredComps.hasOwnProperty(compName)) {
        compsArray.push({
          name: compName,
          count: filteredComps[compName].totalCount,
          comp: filteredComps[compName].comp,
          layers: filteredComps[compName].layers,
        });
      }
    }

    compsArray.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    for (var i = 0; i < compsArray.length; i++) {
      var compData = compsArray[i];
      var tableRow = ui.compositionsListBox.add('item', compData.name);
      tableRow.subItems[0].text = compData.count.toString();

      tableRow.compData = {
        comp: compData.comp,
        layers: compData.layers,
        searchTerm: searchTerm,
      };
    }

    if (compsArray.length === 0) {
      var noResultsRow = ui.compositionsListBox.add(
        'item',
        'No expressions match "' + searchTerm + '"'
      );
      noResultsRow.subItems[0].text = '';
    }
  }

  /**
   * Clears the search box and shows all compositions
   */
  function handleClearSearch() {
    ui.searchBox.text = '';
    populateCompositionsList();
    clearLayersList();
    clearPropertiesList();
  }

  /**
   * Handles composition selection
   */
  function handleCompositionSelection() {
    var selectedComp = ui.compositionsListBox.selection;
    if (!selectedComp || !selectedComp.compData) {
      clearLayersList();
      clearPropertiesList();
      ui.gotoBtn.enabled = false;
      return;
    }

    var searchTerm = selectedComp.compData.searchTerm || '';
    populateLayersList(selectedComp.compData.comp.name, searchTerm);
    clearPropertiesList();
    ui.gotoBtn.enabled = false;
  }

  /**
   * Handles layer selection
   */
  function handleLayerSelection() {
    var selectedLayer = ui.layersListBox.selection;
    if (!selectedLayer || !selectedLayer.layerData) {
      clearPropertiesList();
      ui.gotoBtn.enabled = false;
      return;
    }

    var selectedComp = ui.compositionsListBox.selection;
    var searchTerm = selectedComp.compData.searchTerm || '';

    populatePropertiesList(
      selectedComp.compData.comp.name,
      selectedLayer.layerData.layer.name,
      searchTerm
    );
    ui.gotoBtn.enabled = false;
  }

  /**
   * Handles property selection
   */
  function handlePropertySelection() {
    var selectedProperty = ui.propertiesListBox.selection;
    ui.gotoBtn.enabled = selectedProperty !== null && selectedProperty.propData;
  }

  /**
   * Handles navigation to selected property
   */
  function handleGotoProperty() {
    var selectedProperty = ui.propertiesListBox.selection;

    if (!selectedProperty || !selectedProperty.propData) {
      alert(CONFIG.ALERT.NO_PROPERTY_SELECTED);
      return;
    }

    navigateToProperty(selectedProperty.propData);
  }

  /**
   * Handles refresh button click
   */
  function handleRefresh() {
    scanProject();
  }

  /************************************************************
   * CORE FUNCTIONALITY - PROJECT SCANNING
   ************************************************************/

  /**
   * Scans the active project for all expression usage
   */
  function scanProject() {
    app.beginUndoGroup('Scan Project Expressions');

    try {
      expressionData = {};
      allExpressions = [];

      if (!app.project) {
        throw new Error(CONFIG.ALERT.NO_PROJECT);
      }

      currentProject = app.project;
      scanAllCompositions();

      populateCompositionsList();
      clearLayersList();
      clearPropertiesList();

      var compCount = 0;
      for (var key in expressionData) {
        if (expressionData.hasOwnProperty(key)) {
          compCount++;
        }
      }
      if (compCount === 0) {
        ui.compositionsListBox.removeAll();
        ui.compositionsListBox.add('item', CONFIG.UI.LABEL.NO_EXPRESSIONS);
      }
    } catch (error) {
      alert(CONFIG.ALERT.ERROR_GENERIC + error.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  /**
   * Scans all compositions in the project
   */
  function scanAllCompositions() {
    for (var i = 1; i <= app.project.items.length; i++) {
      var item = app.project.items[i];

      if (item instanceof CompItem) {
        scanComposition(item);
      }
    }
  }

  /**
   * Scans a single composition for expressions
   * @param {CompItem} comp - Composition to scan
   */
  function scanComposition(comp) {
    var compExpressions = {
      comp: comp,
      layers: {},
      totalCount: 0,
    };

    for (var layerIndex = 1; layerIndex <= comp.layers.length; layerIndex++) {
      var layer = comp.layers[layerIndex];
      var layerExpressions = scanLayer(comp, layer, layerIndex);

      if (layerExpressions.properties.length > 0) {
        compExpressions.layers[layer.name] = layerExpressions;
        compExpressions.totalCount += layerExpressions.properties.length;
      }
    }

    if (compExpressions.totalCount > 0) {
      expressionData[comp.name] = compExpressions;
    }
  }

  /**
   * Scans a single layer for expressions
   * @param {CompItem} comp - Parent composition
   * @param {Layer} layer - Layer to scan
   * @param {number} layerIndex - Layer index in composition
   * @returns {Object} Layer expression data
   */
  function scanLayer(comp, layer, layerIndex) {
    var layerData = {
      layer: layer,
      layerIndex: layerIndex,
      properties: [],
    };

    scanPropertyGroup(comp, layer, layer, '', layerData);

    return layerData;
  }

  /**
   * Recursively scans a property group for expressions
   * @param {CompItem} comp - Parent composition
   * @param {Layer} layer - Parent layer
   * @param {PropertyGroup} propGroup - Property group to scan
   * @param {string} parentPath - Path to this property group
   * @param {Object} layerData - Layer data object to populate
   */
  function scanPropertyGroup(comp, layer, propGroup, parentPath, layerData) {
    for (var i = 1; i <= propGroup.numProperties; i++) {
      var prop = propGroup.property(i);
      var propPath = parentPath ? parentPath + ' > ' + prop.name : prop.name;

      if (prop.propertyType === PropertyType.PROPERTY) {
        // Check if this property has an expression
        if (
          prop.canSetExpression &&
          prop.expressionEnabled &&
          prop.expression
        ) {
          var expressionText = prop.expression;

          var propData = {
            comp: comp,
            layer: layer,
            property: prop,
            propertyPath: propPath,
            expression: expressionText,
            enabled: prop.expressionEnabled,
          };

          layerData.properties.push(propData);
          allExpressions.push(propData);
        }
      } else if (
        prop.propertyType === PropertyType.INDEXED_GROUP ||
        prop.propertyType === PropertyType.NAMED_GROUP
      ) {
        // Recursively scan property groups
        scanPropertyGroup(comp, layer, prop, propPath, layerData);
      }
    }
  }

  /************************************************************
   * CORE FUNCTIONALITY - UI POPULATION
   ************************************************************/

  /**
   * Populates the compositions list
   */
  function populateCompositionsList() {
    ui.compositionsListBox.removeAll();

    var compsArray = [];
    for (var compName in expressionData) {
      if (expressionData.hasOwnProperty(compName)) {
        var compData = expressionData[compName];
        compsArray.push({
          name: compName,
          count: compData.totalCount,
          comp: compData.comp,
          layers: compData.layers,
        });
      }
    }

    compsArray.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    for (var i = 0; i < compsArray.length; i++) {
      var compData = compsArray[i];
      var tableRow = ui.compositionsListBox.add('item', compData.name);
      tableRow.subItems[0].text = compData.count.toString();

      tableRow.compData = {
        comp: compData.comp,
        layers: compData.layers,
      };
    }

    if (compsArray.length === 0) {
      var noExpressionsRow = ui.compositionsListBox.add(
        'item',
        CONFIG.UI.LABEL.NO_EXPRESSIONS
      );
      noExpressionsRow.subItems[0].text = '';
    }
  }

  /**
   * Populates the layers list for selected composition
   * @param {string} compName - Name of the selected composition
   * @param {string} searchTerm - Optional search term for filtering
   */
  function populateLayersList(compName, searchTerm) {
    ui.layersListBox.removeAll();

    if (!expressionData[compName]) {
      return;
    }

    var layersData = expressionData[compName].layers;
    var layersArray = [];

    for (var layerName in layersData) {
      if (layersData.hasOwnProperty(layerName)) {
        var layerData = layersData[layerName];
        var count = layerData.properties.length;

        // If there's a search term, filter properties
        if (searchTerm) {
          var matchingProps = [];
          for (var i = 0; i < layerData.properties.length; i++) {
            var propData = layerData.properties[i];
            if (
              propData.expression
                .toLowerCase()
                .indexOf(searchTerm.toLowerCase()) !== -1
            ) {
              matchingProps.push(propData);
            }
          }
          count = matchingProps.length;
        }

        if (count > 0) {
          layersArray.push({
            name: layerName,
            count: count,
            layer: layerData.layer,
            layerIndex: layerData.layerIndex,
            properties: layerData.properties,
          });
        }
      }
    }

    layersArray.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    for (var i = 0; i < layersArray.length; i++) {
      var layerData = layersArray[i];
      var tableRow = ui.layersListBox.add('item', layerData.name);
      tableRow.subItems[0].text = layerData.count.toString();

      tableRow.layerData = layerData;
    }

    if (layersArray.length === 0) {
      var noLayersRow = ui.layersListBox.add(
        'item',
        CONFIG.UI.LABEL.NO_LAYER_SELECTED
      );
      noLayersRow.subItems[0].text = '';
    }
  }

  /**
   * Populates the properties list for selected layer
   * @param {string} compName - Name of the composition
   * @param {string} layerName - Name of the selected layer
   * @param {string} searchTerm - Optional search term for filtering
   */
  function populatePropertiesList(compName, layerName, searchTerm) {
    ui.propertiesListBox.removeAll();

    if (
      !expressionData[compName] ||
      !expressionData[compName].layers[layerName]
    ) {
      return;
    }

    var layerData = expressionData[compName].layers[layerName];
    var properties = layerData.properties;

    // Filter properties if there's a search term
    var filteredProperties = properties;
    if (searchTerm) {
      filteredProperties = [];
      for (var i = 0; i < properties.length; i++) {
        var propData = properties[i];
        if (
          propData.expression
            .toLowerCase()
            .indexOf(searchTerm.toLowerCase()) !== -1
        ) {
          filteredProperties.push(propData);
        }
      }
    }

    for (var i = 0; i < filteredProperties.length; i++) {
      var propData = filteredProperties[i];

      // Truncate long expressions for display
      var displayExpression = propData.expression;
      if (displayExpression.length > 50) {
        displayExpression = displayExpression.substring(0, 47) + '...';
      }

      // Replace newlines with spaces for table display
      displayExpression = displayExpression
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');

      var tableRow = ui.propertiesListBox.add('item', propData.propertyPath);
      tableRow.subItems[0].text = displayExpression;

      tableRow.propData = propData;
    }

    if (filteredProperties.length === 0) {
      var noPropsRow = ui.propertiesListBox.add(
        'item',
        CONFIG.UI.LABEL.NO_LAYER_SELECTED
      );
      noPropsRow.subItems[0].text = '';
    }
  }

  /**
   * Clears the layers list
   */
  function clearLayersList() {
    ui.layersListBox.removeAll();
    var placeholderRow = ui.layersListBox.add(
      'item',
      CONFIG.UI.LABEL.NO_COMP_SELECTED
    );
    placeholderRow.subItems[0].text = '';
  }

  /**
   * Clears the properties list
   */
  function clearPropertiesList() {
    ui.propertiesListBox.removeAll();
    var placeholderRow = ui.propertiesListBox.add(
      'item',
      CONFIG.UI.LABEL.NO_LAYER_SELECTED
    );
    placeholderRow.subItems[0].text = '';
  }

  /************************************************************
   * CORE FUNCTIONALITY - NAVIGATION
   ************************************************************/

  /**
   * Navigates to the specified property in After Effects
   * @param {Object} propData - Property data object
   */
  function navigateToProperty(propData) {
    try {
      var comp = propData.comp;
      var layer = propData.layer;
      var property = propData.property;

      // Clear existing selections
      for (var i = 1; i <= comp.layers.length; i++) {
        comp.layers[i].selected = false;
      }

      // Open composition and select the layer
      comp.openInViewer();
      layer.selected = true;

      // Try to select the property (this may not work for all property types)
      try {
        if (property && property.selected !== undefined) {
          property.selected = true;
        }
      } catch (propError) {
        // Property selection might not be supported, but that's okay
      }
    } catch (error) {
      alert(CONFIG.ALERT.ERROR_GENERIC + error.toString());
    }
  }

  /************************************************************
   * UTILITY FUNCTIONS
   ************************************************************/

  /**
   * Validates that a project is open and accessible
   * @returns {boolean} True if project state is valid
   */
  function validateProjectState() {
    if (!app.project) {
      alert(CONFIG.ALERT.NO_PROJECT);
      return false;
    }

    return true;
  }

  // Initialize the script
  init();
})(this);
