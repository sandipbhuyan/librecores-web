function algoliaAutocomplete(algoliaConfig) {
  var client = algoliasearch(algoliaConfig.applicationId, algoliaConfig.searchKey)
  var projects = client.initIndex('projects');
  var classifications = client.initIndex('classifications');
  var organization = client.initIndex('organization');
  var user = client.initIndex('user');

  autocomplete('#search-form-input', {} ,[
    {
      source: autocomplete.sources.hits(projects, { hitsPerPage: 5 }),
      displayKey: 'name',
      templates: {
        header: '<div class="aa-suggestions-category">Projects</div>',
        suggestion: function(suggestion) {
          return '<span>' +
            suggestion._highlightResult.name.value + '</span><span>'
            + suggestion._highlightResult.displayName.value + '</span>';
        }
      }
    },
    {
      source: autocomplete.sources.hits(organization, { hitsPerPage: 5 }),
      displayKey: 'name',
      templates: {
        header: '<div class="aa-suggestions-category">Organizations</div>',
        suggestion: function(suggestion) {
          return '<span>' +
            suggestion._highlightResult.name.value + '</span>  <span>'
            + suggestion._highlightResult.displayName.value + '</span>';
        }
      }
    },
    {
      source: autocomplete.sources.hits(user, { hitsPerPage: 5 }),
      displayKey: 'name',
      templates: {
        header: '<div class="aa-suggestions-category">Users</div>',
        suggestion: function(suggestion) {
          var name = suggestion._highlightResult.name == null ?
            suggestion._highlightResult.username.value : suggestion._highlightResult.name.value;
          return '<span>' +
             name + '</span>  <span>'
            + suggestion._highlightResult.username.value + '</span>';
        }
      }
    }
  ]).on('autocomplete:selected', function(event, suggestion, dataset) {
    if(dataset === 1) {
      $('#search-form-input').val(suggestion['name'])
      $('#type').val('projects');
    }
    if(dataset === 2) {
      $('#search-form-input').val(suggestion['name'])
      $('#type').val('organization');
    }
    if(dataset === 3) {
      $('#search-form-input').val(suggestion['username'])
      $('#type').val('user');
    }
  });
}

function searchFunctions() {
  $('.search-type').on('click',function(event){
    event.preventDefault();
    $('#type').val($(this).attr('id'));
    $('#q').val($('.ais-search-box--input').val());
    $('form').submit();
  })

  $('.search-query').on('click',function(event){
    event.preventDefault();
    $('#q').val($('.ais-search-box--input').val());
    $('form').submit();
  })
}
// Algolia instantsearch configuration
function algoliaInstantSearch(options, searchType) {
  var search = instantsearch({
    appId: options.appId,
    apiKey: options.apiKey,
    indexName: options.indexName,
    routing: true,
    searchParameters: {
      hitsPerPage: 10,
    }
  });

  // Search Box Configuration
  search.addWidget(
    instantsearch.widgets.searchBox({
      container: '#search-input',
      placeholder: 'Search ...',
    })
  );

  // Search Result Configuration
  search.addWidget(
    instantsearch.widgets.hits({
      container: '#hits',
      templates: {
        item: getTemplate(searchType),
        empty: '<h2>Nothing found :-( Maybe try another search keyword?</h2>',
      },
      transformData: {
        item : function item(item) {
          if(searchType === 'projects') {
            item.activityDetails = getTimeDiff(item);
            item.creationDetails = getFormattedDate(item.dateAdded.date);
          }
          if(searchType === 'user') {
            item.createdAt.date = getFormattedDate(item.createdAt.date)
          }
          return item;
        },
      },
    })
  );

  // Pagination
  search.addWidget(
    instantsearch.widgets.pagination({
      container: '#pagination',
      scrollTo: '#search-input',
    })
  );

  search.addWidget(
    instantsearch.widgets.stats({
      container: '#stats',
      transform: {

      },
    })
  );

  search.start();
}

// Get Templates for Result display feature
function getTemplate(templateName) {
  return $('#'+templateName+'-template').html();
}

function getTimeDiff(item) {
  if(item.dateLastActivityOccurred === null) {
    return 0 + ' days before';
  }
  var time = item.dateLastActivityOccurred.date;
  var date = new Date(time);
  var today = new Date();
  var years = today.getFullYear() - date.getFullYear();
  var months = today.getMonth() - date.getMonth();
  var days = today.getUTCDate() - date.getUTCDate();

  if(years > 0) {
    return years === 1 ? years + ' year before' : years + ' years before';
  }

  if(months > 0) {
    return months === 1 ? months + ' month before' : months + ' months before';
  }

  if(days > 0) {
    return days === 1 ? days + ' day before' : days + ' day before';
  }

  return 0 + ' day before'
}

function getFormattedDate(item){
  var timeToFormat = item;
  var date =  new Date(timeToFormat);
  var formattedDate = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
  return formattedDate;
}

// Get the classification hirearchy of a child category
function classificationSearch(root,classificationDetails, classifications) {
  var classification = classifications;
  function getClassificationHierarchy(parentId, name) {
    if(parentId === null) {
      return name;
    }

    for(var i = 0; i < classification.length; i++) {
      if(classification[i]['id'] == parentId) {
        name = classification[i]['name']  + '::' + name;
        return getClassificationHierarchy(classification[i]['parentId'], name);
        break;
      }
    }
  }

  function buildClassificationHierarchy(parentUL, branch) {
    for (var key in branch.children) {
        var item = branch.children[key];
        $item = $('<li>', {
            id: "item" + item.id
        });
        $item.append($('<input>', {
            type: "checkbox",
            name: "item" + item.id,
            value: getClassificationHierarchy(item.parentId, item.name)
        }));
        $item.append($('<label>', {
            for: "item" + item.id,
            text: item.name
        }));
        parentUL.append($item);

        if (item.children) {
            var $ul = $('<ul>').addClass('classification-search').appendTo($item);
            buildClassificationHierarchy($ul, item);
        }
    }
  }
  buildClassificationHierarchy(root, classificationDetails, classifications)
}
