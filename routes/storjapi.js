var express = require('express');
var router = express.Router();
var util=require('util');

/* GET buckets. */
router.get('/listBuckets', function(req, res, next) {
    var storj = req.storj;

    // Set the bridge api URL
    var api = 'https://api.storj.io';

    // API credentials
    var user = {email: 'n.stavrevski@campus.tu-berlin.de', password: 'storjtest'};
    var client = storj.BridgeClient(api, {basicAuth: user});

    // List all buckets
    client.getBuckets(function(err, buckets) {
        if (err) {
        // Handle error on failure.
        return console.log('error', err.message);
    }

    if (!buckets.length) {
        return console.log('warn', 'You have not created any buckets.');
    }

    // Log out info for each bucket
    buckets.forEach(function(bucket) {
        console.log(util.format('Bucket info: ID: %s, Name: %s, Storage: %s, Transfer: %s',bucket.id, bucket.name, bucket.storage, bucket.transfer));
    });
    });
	res.send("Buckets in console");
});

/* GET to Create Access Log and Upload file to Storj*/

router.get('/addaccesslog',function(req,res,next){
var result=[];
var storj = req.storj;

// Set the bridge api URL
var api = 'https://api.storj.io';
//Get the file system
var fs=req.fs;

var through = require('through');
// How many pieces of the file can be uploaded at once
var concurrency = 6;
// API credentials
var user = {email: 'n.stavrevski@campus.tu-berlin.de', password: 'storjtest'};

// console.login using the keypair generated
var client = storj.BridgeClient(api, {basicAuth: user,concurrency: concurrency // Set upload concurrency
});

// Key ring to hold key used to interact with uploaded file
var keyring = storj.KeyRing('./', 'keypass');
// Bucket being uploaded to
var bucket = '1786b47d1b9ba9be8040a84a';

// File to be uploaded
var filepath = './accesslog.json';

//Create access log
var getIP = require('external-ip')();
var date=getDateTime();
getIP(function (err, ip) {
    if (err) {
        // every service in the list has failed 
        throw err;
    }
    //Got IP, download file from storj and append to it


    /* Downloading file */

    //LIST BUCKET FILES
    client.listFilesInBucket(bucket, function(err, files) {
      if (err) {
        return console.log('error', err.message);
      }

      if (!files.length) {
            //Access log doesn't exist in the bucket we need to create it
            console.log("No access log file found!");
            result.push({accessip:ip,datetime:date});
            fs.writeFile(filepath, JSON.stringify(result), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
            });
        //return console.log('warn', 'There are no files in this bucket.');
      }
      else
      {
      // Log out info for each file
      files.forEach(function(file) {
        if(file.filename=='accesslog.json')
        {
            console.log("Found access log file!");

            // Id of file to be downloaded
            var id = file.id;

            // Where the downloaded file will be saved
            var target = fs.createWriteStream(filepath);

            //
            var secret = keyring.get(id);

            // Prepare to decrypt the encrypted file
            var decrypter = new storj.DecryptStream(secret);
            var received = 0;
            // list of servers to exclude when finding the download server
            var exclude = [];

            // Handle Events emitted from file download stream
            target.on('finish', function() {
              console.log('info', util.format('File downloaded and written to %s.',filepath));
              result=JSON.parse(fs.readFileSync(filepath, 'utf8'));
              result.push({accessip:ip,datetime:date});
              //File downloaded, need to append
              fs.writeFile(filepath,JSON.stringify(result), function(err) {
              if(err) {
                  return console.log(err);
              }
              console.log("The file was saved!");
                      //Upload new file in bucket
                      // Path to temporarily store encrypted version of file to be uploaded
                      var tmppath = filepath + '.crypt';
                      
                      // Prepare to encrypt file for upload
                      var secret = new storj.DataCipherKeyIv();
                      var encrypter = new storj.EncryptStream(secret);

                      //Encrypt the file to be uploaded and store it temporarily
                      fs.createReadStream(filepath)
                        .pipe(encrypter)
                        .pipe(fs.createWriteStream(tmppath)).on('finish', function() {

                        // Create token for uploading to bucket by bucketid
                        client.createToken(bucket, 'PUSH', function(err, token) {
                          if (err) {
                            console.log('error', err.message);
                          }

                          // Store the file using the bucket id, token, and encrypted file
                          client.storeFileInBucket(bucket, token.token,tmppath, function(err, file) {
                            if (err) {
                              return console.log('error', err.message);
                            }

                            // Save key for access to download file
                            keyring.set(file.id, secret);

                            console.log(util.format("Uploaded file Info: {'name':'%s','type':'%s','size':'%s','id':'%s'}",file.filename, file.mimetype, file.size, file.id));
                            //var result=util.format("{'name':'%s','type':'%s','size':'%s','id':'%s'}",file.filename, file.mimetype, file.size, file.id);
                            res.send(JSON.stringify(result));
                            return console.log("File updated and stored in Storj");
                          });
                        });
                      });
                
              });
            }).on('error', function(err) {
              console.log('error', err.message);
            });

            // Download the file
            client.createFileStream(bucket, id, {
              exclude: exclude
            },function(err, stream) {
              if (err) {
                return console.log('error', err.message);
              }

              stream.on('error', function(err) {
                console.log('warn', 'Failed to download shard, reason:'+err.message);
                fs.unlink(filepath, function(unlinkFailed) {
                  if (unlinkFailed) {
                    return console.log('error', 'Failed to unlink partial file.');
                  }

                  if (!err.pointer) {
                    return;
                  }

                });
              }).pipe(through(function(chunk) {
                received += chunk.length;
                console.log('info', 'Received'+received+' of '+stream._length+' bytes');
                this.queue(chunk);
              })).pipe(decrypter).pipe(target);
            });
        

            
        }

      });
    }  

    //Upload new file in bucket
    // Path to temporarily store encrypted version of file to be uploaded
    var tmppath = filepath + '.crypt';
    
    // Prepare to encrypt file for upload
    var secret = new storj.DataCipherKeyIv();
    var encrypter = new storj.EncryptStream(secret);

    //Encrypt the file to be uploaded and store it temporarily
    fs.createReadStream(filepath)
      .pipe(encrypter)
      .pipe(fs.createWriteStream(tmppath)).on('finish', function() {

      // Create token for uploading to bucket by bucketid
      client.createToken(bucket, 'PUSH', function(err, token) {
        if (err) {
          console.log('error', err.message);
        }

        // Store the file using the bucket id, token, and encrypted file
        client.storeFileInBucket(bucket, token.token,tmppath, function(err, file) {
          if (err) {
            return console.log('error', err.message);
          }

          // Save key for access to download file
          keyring.set(file.id, secret);
          res.send(JSON.stringify(result));
          console.log(util.format("Uploaded file Info: {'name':'%s','type':'%s','size':'%s','id':'%s'}",file.filename, file.mimetype, file.size, file.id));
        });
      });
    });

    });

});

});

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;

}

module.exports = router;