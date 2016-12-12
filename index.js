var _ = require('gearjs').util;
var path = require('path');
var colors = require('colors');

function upload(receiver, to, data, release, content, file, callback) {
  var subpath = file.subpath;
  var d = new Date();
  var time = ['[', d.getHours(), ':', d.getMinutes(), ':', d.getSeconds(), ']'].join('');
  data['to'] = _(path.join(to, release));
  _.upload(
      //url, request options, post data, file
      receiver, null, data, content, subpath,
      function(err, res) {
        if (err || res.trim() != '0') {
          // callback('upload file [' + subpath + '] to [' + to + '] by receiver [' + receiver + '] error [' + (err || res) + ']');
          process.stdout.write(
            ' - '.red.bold +
            time.grey + ' ' +
            subpath.red +
            ' fail '.red +
            '\n'
         );
        } else {
          process.stdout.write(
              ' - '.green.bold +
              time.grey + ' ' +
              subpath.replace(/^\//, '') +
              ' >> '.yellow.bold +
              to + release +
              '\n'
          );
        }
        callback();// 上传失败可继续上传
      }
  );
}

module.exports = function(options, modified, total, callback) {
  if (!options.to) {
    throw new Error('options.to is required!');
  } else if (!options.receiver) {
    throw new Error('options.receiver is required!');
  }

  var to = options.to;
  var receiver = options.receiver;
  var data = options.data || {};

  var steps = [];

  modified.forEach(function(file) {
    var reTryCount = options.retry;

    steps.push(function(next) {
      var _upload = arguments.callee;

      // 目标路径
      // console.log(file.getHashRelease()) --> /protected/config/wii_ui/aaa/config/chart-map.json
      // 文件内容
      // console.log(file.getContent()) --> 
      // 上传文件的文件名
      // console.log(file.subpath) --> /aaa/config/chart-map.json
      upload(receiver, to, data, file.getHashRelease(), file.getContent(), file, function(error) {
        if (error) {
          if (options.retry && !--reTryCount) {
            throw new Error(error);
          } else {
            _upload();
          }
        } else {
          if(next) {
            next();
          }
        }
      });
    });
  });

  _.reduceRight(steps, function(next, current) {
    return function() {
      current(next);
    };
  }, callback)();
};

module.exports.options = {
  // 允许重试两次。
  retry: 2
};
