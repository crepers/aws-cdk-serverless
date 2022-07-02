const mysql = require('mysql');
const SecretsManager = require('./SecretsManager.js');

var rdsdataservice = undefined;

exports.handler = async function(event, context) {
  try {
      // If 'rdsdataservice' variable doesn't exist
        if (typeof rdsdataservice === 'undefined') {
            
            let secret = await SecretsManager.getSecret(process.env.SECRET, 'ap-northeast-2');
            console.log(secret);
            if(secret) {
                let secretValue = JSON.parse(secret);

                // Connect to the MySQL database
                var rdsdataservice = mysql.createConnection({
                        host: secretValue.host,
                        port: 3306,
                        user     : secretValue.username,
                        password : secretValue.password,
                });
             
                rdsdataservice.connect();
            } else {
                console.log('Cannot find secret values');
            }
        }

        const sql = 'select * from userservice.member;'
        const result = await new Promise((resolve, reject) => {  
            rdsdataservice.query(sql, function (err, result) {
                if (err) throw err;

                resolve(result);  
            })
        });
          
        return {
             statusCode: 200,
             headers: {},
             body: JSON.stringify(result)
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