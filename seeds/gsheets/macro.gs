function onOpen() {
  var spreadsheet = SpreadsheetApp.getActive();
  var menuItems = [
    {name: 'Publish to staging', functionName: 'publishStaging'},
    {name: 'Publish to production', functionName: 'publishProduction'}
  ];
  spreadsheet.addMenu('Republik', menuItems);
}

function publishStaging() {
  var id = SpreadsheetApp.getActiveSpreadsheet().getId()
  Logger.log("sending update request...");
  var response = UrlFetchApp.fetch('https://api.staging.republik.ch/gsheets/'+id, {
    'headers': {
      'authorization': 'Basic YOUR_PASS_BASE64'
    }
  });
  Logger.log(response);
}

function publishProduction() {
  var id = SpreadsheetApp.getActiveSpreadsheet().getId()
  Logger.log("sending update request...");
  var response = UrlFetchApp.fetch('https://api.republik.ch/gsheets/'+id);
  Logger.log(response);
}
