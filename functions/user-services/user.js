const AWS = require('aws-sdk');
var rdsdataservice = new AWS.RDSDataService();

exports.main = async function(event, context) {
  try {
    var method = event.httpMethod;
    var recordName = event.path.startsWith('/') ? event.path.substring(1) : event.path;
// Defining parameters for rdsdataservice
    var params = {
      resourceArn: process.env.TABLE,
      secretArn: process.env.TABLESECRET,
      database: process.env.DATABASE,
   }
   if (method === "GET") {
      if (event.path === "/") {
       //Here is where we are defining the SQL query that will be run at the DATA API
       params['sql'] = 'select * from records';
       const data = await rdsdataservice.executeStatement(params).promise();
       var body = {
           records: data
       };
       return {
         statusCode: 200,
         headers: {},
         body: JSON.stringify(body)
       };
     }
     else if (recordName) {
       params['sql'] = `SELECT singers.id, singers.name, singers.nationality, records.title FROM singers INNER JOIN records on records.recordid = singers.recordid WHERE records.title LIKE '${recordName}%';`
       const data = await rdsdataservice.executeStatement(params).promise();
       var body = {
           singer: data
       };
       return {
         statusCode: 200,
         headers: {},
         body: JSON.stringify(body)
       };
     }
   }
   else if (method === "POST") {
     var payload = JSON.parse(event.body);
     if (!payload) {
       return {
         statusCode: 400,
         headers: {},
         body: "The body is missing"
       };
     }

     //Generating random IDs
     var recordId = uuidv4();
     var singerId = uuidv4();

     //Parsing the payload from body
     var recordTitle = `${payload.recordTitle}`;
     var recordReleaseDate = `${payload.recordReleaseDate}`;
     var singerName = `${payload.singerName}`;
     var singerNationality = `${payload.singerNationality}`;

      //Making 2 calls to the data API to insert the new record and singer
      params['sql'] = `INSERT INTO records(recordid,title,release_date) VALUES(${recordId},"${recordTitle}","${recordReleaseDate}");`;
      const recordsWrite = await rdsdataservice.executeStatement(params).promise();
      params['sql'] = `INSERT INTO singers(recordid,id,name,nationality) VALUES(${recordId},${singerId},"${singerName}","${singerNationality}");`;
      const singersWrite = await rdsdataservice.executeStatement(params).promise();

      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify("Your record has been saved")
      };

    }
    // We got something besides a GET, POST, or DELETE
    return {
      statusCode: 400,
      headers: {},
      body: "We only accept GET, POST, and DELETE, not " + method
    };
  } catch(error) {
    var body = error.stack || JSON.stringify(error, null, 2);
    return {
      statusCode: 400,
      headers: {},
      body: body
    }
  }
}
function uuidv4() {
  return 'xxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v;
  });
}